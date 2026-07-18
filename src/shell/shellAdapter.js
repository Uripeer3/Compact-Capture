// SPDX-License-Identifier: GPL-3.0-only

import Clutter from 'gi://Clutter';

import {InjectionManager} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Config from 'resource:///org/gnome/shell/misc/config.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {AsyncTaskGate} from '../core/asyncTaskGate.js';
import {shortcutAction} from '../core/keyboardShortcuts.js';
import {
    AreaState,
    CaptureType,
    createSelectionLifecycle,
    EmptySelectionEffect,
    LifecycleEvent,
    ScreenshotMode,
    transitionSelectionLifecycle,
} from '../core/selectionLifecycle.js';
import {SignalConnectionSet} from '../core/signalConnectionSet.js';
import {AnnotatedOutputBridge} from './annotatedOutputBridge.js';
import {EmptySelectionController} from './emptySelectionController.js';
import {createAnnotationOutput} from './outputRenderer.js';
import {inspectScreenshotUi} from './screenshotUiContract.js';

const EMPTY_SELECTION_COORDINATE = -1_000_000;
const SELECTION_HANDLE_FIELDS = Object.freeze([
    '_topLeftHandle',
    '_topRightHandle',
    '_bottomLeftHandle',
    '_bottomRightHandle',
]);

function selectionVisualActors(selector) {
    return [
        selector._areaIndicator._selectionRect,
        ...SELECTION_HANDLE_FIELDS.map(field => selector[field]),
    ];
}

function freezeMonitor(monitor, index) {
    return Object.freeze({
        index,
        x: monitor.x,
        y: monitor.y,
        width: monitor.width,
        height: monitor.height,
    });
}

export class ScreenshotUiAdapter {
    #active = false;
    #compatibility = null;
    #connections = [];
    #emptySelectionController = new EmptySelectionController({
        onError: (message, error) => console.error(
            `Compact Capture ${message}`,
            error
        ),
    });
    #injectionManager = null;
    #onCaptureChanged;
    #onClosed;
    #onModeChanged;
    #onOpened;
    #onSelectionChanged;
    #onSelectionStarted;
    #onShortcut;
    #outputBridge;
    #screenshotUi;
    #screenshotUiPrototype;
    #screenSelectorConnections = new SignalConnectionSet({
        onDisconnectError: error => console.error(
            'Compact Capture could not disconnect a screen selector',
            error
        ),
    });
    #sessionOpen = false;
    #selectionLifecycle = createSelectionLifecycle();
    #captureGate = new AsyncTaskGate();
    #prepareCapture;

    constructor({
        onOpened = null,
        onClosed = null,
        onModeChanged = null,
        onCaptureChanged = null,
        onSelectionStarted = null,
        onSelectionChanged = null,
        onShortcut = null,
        prepareCapture = null,
    } = {}) {
        this.#screenshotUi = Main.screenshotUI;
        this.#screenshotUiPrototype = this.#screenshotUi
            ? Object.getPrototypeOf(this.#screenshotUi)
            : null;
        this.#onOpened = onOpened;
        this.#onClosed = onClosed;
        this.#onModeChanged = onModeChanged;
        this.#onCaptureChanged = onCaptureChanged;
        this.#onSelectionStarted = onSelectionStarted;
        this.#onSelectionChanged = onSelectionChanged;
        this.#onShortcut = onShortcut;
        this.#prepareCapture = prepareCapture;
        this.#outputBridge = new AnnotatedOutputBridge({
            screenshotUi: this.#screenshotUi,
            createOutput: createAnnotationOutput,
        });
    }

    get active() {
        return this.#active;
    }

    get compatibility() {
        return this.#compatibility;
    }

    enable() {
        if (this.#active)
            return true;

        this.#compatibility = inspectScreenshotUi(
            Config.PACKAGE_VERSION,
            this.#screenshotUi
        );

        if (!this.#compatibility.compatible) {
            console.warn(
                `Compact Capture disabled its ScreenshotUI adapter: ${
                    this.#compatibility.issues.join('; ')}`
            );
            return false;
        }

        const injectionManager = new InjectionManager();
        const connections = [];

        try {
            const adapter = this;
            injectionManager.overrideMethod(
                this.#screenshotUiPrototype,
                'open',
                originalMethod => async function (...args) {
                    const result = await originalMethod.apply(this, args);
                    adapter.#handleOpenCompleted();
                    return result;
                }
            );
            injectionManager.overrideMethod(
                this.#screenshotUiPrototype,
                '_saveScreenshot',
                originalMethod => async function (...args) {
                    return adapter.#saveScreenshot(
                        this,
                        originalMethod,
                        args
                    );
                }
            );

            this.#connect(
                connections,
                this.#screenshotUi,
                'closed',
                () => this.#handleClosed()
            );
            this.#connect(
                connections,
                this.#screenshotUi._shotButton,
                'notify::checked',
                () => this.#handleModeChanged()
            );
            this.#connect(
                connections,
                this.#screenshotUi,
                'key-press-event',
                (_actor, event) => this.#handleKeyPress(event)
            );
            this.#connect(
                connections,
                this.#screenshotUi._areaSelector,
                'drag-started',
                () => this.#handleSelectionStarted()
            );
            this.#connect(
                connections,
                this.#screenshotUi._areaSelector,
                'drag-ended',
                () => this.#handleSelectionChanged()
            );

            for (const button of [
                this.#screenshotUi._selectionButton,
                this.#screenshotUi._screenButton,
                this.#screenshotUi._windowButton,
            ]) {
                this.#connect(
                    connections,
                    button,
                    'notify::checked',
                    () => this.#handleCaptureChanged()
                );
            }

            this.#injectionManager = injectionManager;
            this.#connections = connections;
            this.#sessionOpen = false;
            this.#selectionLifecycle = createSelectionLifecycle();
            this.#active = true;
            return true;
        } catch (error) {
            this.#disconnectAll(connections);
            injectionManager.clear();
            console.error(
                'Compact Capture could not enable its ScreenshotUI adapter',
                error
            );
            return false;
        }
    }

    disable() {
        try {
            this.#leaveEmptySelection({resetGeometry: true});
        } finally {
            this.#screenSelectorConnections.clear();
            this.#disconnectAll(this.#connections);
            this.#connections = [];
            try {
                this.#injectionManager?.clear();
            } catch (error) {
                console.error(
                    'Compact Capture could not clear its method injections',
                    error
                );
            }
            this.#injectionManager = null;
            this.#sessionOpen = false;
            this.#selectionLifecycle = createSelectionLifecycle();
            this.#active = false;
        }
    }

    mountSelectionHint(hint) {
        if (!this.#active || !this.#sessionOpen || !hint ||
            hint.get_parent?.()) {
            return false;
        }

        try {
            this.#screenshotUi._primaryMonitorBin.add_child(hint);
            return hint.get_parent?.() ===
                this.#screenshotUi._primaryMonitorBin;
        } catch (error) {
            console.error(
                'Compact Capture could not mount its selection hint',
                error
            );
            return false;
        }
    }

    unmountSelectionHint(hint) {
        if (!hint)
            return;

        try {
            const host = this.#screenshotUi?._primaryMonitorBin;
            if (hint.get_parent?.() === host)
                host.remove_child(hint);
        } catch (error) {
            console.error(
                'Compact Capture could not unmount its selection hint',
                error
            );
        }
    }

    mountToolbar(toolbar) {
        if (!this.#active || !this.#sessionOpen || !toolbar)
            return false;

        const toolbarHost = this.#screenshotUi;

        const actors = [toolbar, ...(toolbar.auxiliaryActors ?? [])];
        const mountedActors = [];
        try {
            for (const actor of actors) {
                if (actor.get_parent?.())
                    throw new Error('Toolbar actor already has a parent');
                toolbarHost.add_child(actor);
                mountedActors.push(actor);
            }
            return true;
        } catch (error) {
            for (const actor of mountedActors.reverse()) {
                if (actor.get_parent?.() === toolbarHost)
                    toolbarHost.remove_child(actor);
            }
            console.error('Compact Capture could not mount its toolbar', error);
            return false;
        }
    }

    placeToolbar(toolbar, placement) {
        const monitor = this.#monitorSnapshot(placement.monitorIndex);
        const toolbarHost = this.#screenshotUi;
        if (!monitor || toolbar.get_parent?.() !== toolbarHost)
            return false;

        const [ok, localX, localY] = toolbarHost.transform_stage_point(
            placement.x,
            placement.y
        );
        if (!ok)
            return false;

        toolbar.set_position(localX, localY);
        return true;
    }

    unmountToolbar(toolbar) {
        if (!toolbar)
            return;

        const actors = [toolbar, ...(toolbar.auxiliaryActors ?? [])];
        for (const actor of actors.reverse()) {
            try {
                actor.get_parent?.()?.remove_child(actor);
            } catch (error) {
                console.error(
                    'Compact Capture could not unmount a toolbar actor',
                    error
                );
            }
        }
    }

    mountOverlay(overlay) {
        if (!this.#active || !this.#sessionOpen || !overlay)
            return false;
        if (overlay.get_parent?.())
            return false;

        try {
            this.#screenshotUi.insert_child_below(
                overlay,
                this.#screenshotUi._primaryMonitorBin
            );
            return overlay.get_parent?.() === this.#screenshotUi;
        } catch (error) {
            console.error(
                'Compact Capture could not mount a drawing overlay',
                error
            );
            return false;
        }
    }

    unmountOverlay(overlay) {
        if (!overlay)
            return;

        try {
            if (overlay.get_parent?.() === this.#screenshotUi)
                this.#screenshotUi.remove_child(overlay);
        } catch (error) {
            console.error(
                'Compact Capture could not unmount a drawing overlay',
                error
            );
        }
    }

    #connect(connections, target, signal, callback) {
        const id = target.connect(signal, callback);
        connections.push([target, id]);
    }

    #disconnectAll(connections) {
        for (const [target, id] of [...connections].reverse()) {
            try {
                target.disconnect(id);
            } catch (error) {
                console.error(
                    'Compact Capture could not disconnect a Shell signal',
                    error
                );
            }
        }
    }

    #monitorSnapshot(index) {
        const monitor = Main.layoutManager.monitors[index];
        return monitor ? freezeMonitor(monitor, index) : null;
    }

    #handleOpenCompleted() {
        if (!this.#active || this.#sessionOpen || !this.#screenshotUi.visible)
            return;

        this.#sessionOpen = true;
        this.#rebindScreenSelectors();
        this.#transitionSelectionLifecycle({
            type: LifecycleEvent.OPENED,
            mode: this.#mode(),
            captureType: this.#captureType(),
        });
        if (!this.#active)
            return;
        const session = this.#currentSession();
        this.#invokeSafely(this.#onOpened, 'opened', session);
    }

    #handleClosed() {
        if (!this.#active || !this.#sessionOpen)
            return;

        this.#transitionSelectionLifecycle({type: LifecycleEvent.CLOSED});
        this.#screenSelectorConnections.clear();
        this.#sessionOpen = false;
        this.#invokeSafely(this.#onClosed, 'closed');
    }

    #handleModeChanged() {
        if (!this.#canDispatch())
            return;

        const transition = this.#transitionSelectionLifecycle({
            type: LifecycleEvent.MODE_CHANGED,
            mode: this.#mode(),
        });
        if (!transition.changed)
            return;

        this.#invokeSafely(
            this.#onModeChanged,
            'mode change',
            this.#currentSession()
        );
    }

    #handleCaptureChanged() {
        if (!this.#canDispatch())
            return;

        const captureType = this.#captureType();
        const transition = this.#transitionSelectionLifecycle({
            type: LifecycleEvent.CAPTURE_CHANGED,
            captureType,
        });
        if (!transition.changed)
            return;

        const session = this.#currentSession();
        this.#invokeSafely(
            this.#onCaptureChanged,
            'capture type change',
            session
        );
    }

    #handleSelectionStarted() {
        if (!this.#canDispatch())
            return;
        this.#transitionSelectionLifecycle({
            type: LifecycleEvent.SELECTION_STARTED,
        });
        this.#invokeSafely(this.#onSelectionStarted, 'selection drag start');
    }

    #handleSelectionChanged() {
        if (!this.#canDispatch())
            return;
        this.#transitionSelectionLifecycle({
            type: LifecycleEvent.SELECTION_COMPLETED,
        });
        this.#invokeSafely(
            this.#onSelectionChanged,
            'selection drag end',
            this.#currentSession()
        );
    }

    #handleScreenSelectionChanged(selector) {
        if (!this.#canDispatch() || !selector.checked ||
            !this.#screenshotUi._screenButton.checked) {
            return;
        }

        this.#invokeSafely(
            this.#onCaptureChanged,
            'screen selection change',
            this.#currentSession()
        );
    }

    #canDispatch() {
        return this.#active && this.#sessionOpen && this.#screenshotUi.visible;
    }

    #handleKeyPress(event) {
        if (this.#emptySelectionController.active &&
            this.#isCaptureShortcut(event)) {
            return Clutter.EVENT_STOP;
        }
        if (!this.#canDispatch())
            return Clutter.EVENT_PROPAGATE;

        const action = shortcutAction({
            key: this.#shortcutKey(event.get_key_symbol()),
            control: Boolean(
                event.get_state() & Clutter.ModifierType.CONTROL_MASK
            ),
            shift: Boolean(
                event.get_state() & Clutter.ModifierType.SHIFT_MASK
            ),
        });
        if (!action || typeof this.#onShortcut !== 'function')
            return Clutter.EVENT_PROPAGATE;

        try {
            return this.#onShortcut(action)
                ? Clutter.EVENT_STOP
                : Clutter.EVENT_PROPAGATE;
        } catch (error) {
            console.error(
                'Compact Capture failed while handling an editing shortcut',
                error
            );
            return Clutter.EVENT_PROPAGATE;
        }
    }

    #shortcutKey(symbol) {
        if (symbol === Clutter.KEY_z || symbol === Clutter.KEY_Z)
            return 'z';
        if (symbol === Clutter.KEY_y || symbol === Clutter.KEY_Y)
            return 'y';
        return '';
    }

    #isCaptureShortcut(event) {
        const symbol = event.get_key_symbol();
        if (symbol === Clutter.KEY_Return ||
            symbol === Clutter.KEY_space ||
            symbol === Clutter.KEY_KP_Enter ||
            symbol === Clutter.KEY_ISO_Enter) {
            return true;
        }

        const controlPressed =
            event.get_state() & Clutter.ModifierType.CONTROL_MASK;
        return controlPressed &&
            (symbol === Clutter.KEY_c || symbol === Clutter.KEY_C);
    }

    #captureType() {
        if (this.#screenshotUi._windowButton.checked)
            return CaptureType.WINDOW;
        if (this.#screenshotUi._screenButton.checked)
            return CaptureType.SCREEN;
        return CaptureType.SELECTION;
    }

    #mode() {
        return this.#screenshotUi._shotButton.checked
            ? ScreenshotMode.SCREENSHOT
            : ScreenshotMode.RECORDING;
    }

    async #saveScreenshot(screenshotUi, originalMethod, args) {
        if (screenshotUi !== this.#screenshotUi ||
            !this.#active || !this.#sessionOpen ||
            !this.#screenshotUi._shotButton.checked ||
            this.#captureType() === CaptureType.WINDOW) {
            return originalMethod.apply(screenshotUi, args);
        }

        return this.#captureGate.run(() => this.#prepareAndSaveScreenshot(
            screenshotUi,
            originalMethod,
            args
        ));
    }

    async #prepareAndSaveScreenshot(screenshotUi, originalMethod, args) {
        const session = this.#currentSession();
        if (!session.selection)
            return originalMethod.apply(screenshotUi, args);

        let preparation;
        try {
            preparation = this.#prepareCapture?.() ?? null;
            if (!preparation)
                return originalMethod.apply(screenshotUi, args);
            if (!Array.isArray(preparation.annotations) ||
                typeof preparation.release !== 'function') {
                preparation.release?.();
                throw new TypeError('Capture preparation is invalid');
            }
        } catch (error) {
            console.error(
                'Compact Capture could not prepare its annotation document',
                error
            );
            return originalMethod.apply(screenshotUi, args);
        }

        return this.#savePreparedScreenshot(
            screenshotUi,
            originalMethod,
            args,
            session,
            preparation
        );
    }

    async #savePreparedScreenshot(
        screenshotUi,
        originalMethod,
        args,
        session,
        preparation
    ) {
        try {
            if (preparation.annotations.length === 0)
                return await originalMethod.apply(screenshotUi, args);

            return await this.#outputBridge.save({
                screenshotUi,
                originalMethod,
                args,
                strokes: preparation.annotations,
                selection: session.selection,
                outputScale: session.outputScale,
            });
        } finally {
            try {
                preparation.release();
            } catch (error) {
                console.error(
                    'Compact Capture could not restore annotation input',
                    error
                );
            }
        }
    }

    #enterEmptySelection() {
        const selector = this.#screenshotUi._areaSelector;
        return this.#emptySelectionController.enter({
            selector,
            visualActors: selectionVisualActors(selector),
            captureButton: this.#screenshotUi._captureButton,
            cursorType: Clutter.CursorType.CROSSHAIR,
            emptyCoordinate: EMPTY_SELECTION_COORDINATE,
        });
    }

    #leaveEmptySelection({resetGeometry}) {
        return this.#emptySelectionController.leave({resetGeometry});
    }

    #transitionSelectionLifecycle(event) {
        const transition = transitionSelectionLifecycle(
            this.#selectionLifecycle,
            event
        );
        if (transition.effect === EmptySelectionEffect.ENTER) {
            if (!this.#enterEmptySelection()) {
                const failedTransition = Object.freeze({
                    ...transition,
                    state: this.#selectionLifecycle,
                    changed: false,
                    effect: EmptySelectionEffect.NONE,
                    failed: true,
                });
                this.disable();
                return failedTransition;
            }
        } else if (
            transition.effect === EmptySelectionEffect.LEAVE_KEEP_GEOMETRY
        ) {
            this.#leaveEmptySelection({resetGeometry: false});
        } else if (
            transition.effect === EmptySelectionEffect.LEAVE_RESET_GEOMETRY
        ) {
            this.#leaveEmptySelection({resetGeometry: true});
        }

        this.#selectionLifecycle = transition.state;
        return transition;
    }

    #rebindScreenSelectors() {
        try {
            this.#screenSelectorConnections.replace(
                this.#screenshotUi._screenSelectors,
                'notify::checked',
                selector => this.#handleScreenSelectionChanged(selector)
            );
        } catch (error) {
            console.error(
                'Compact Capture could not bind screen selectors for session',
                error
            );
        }
    }

    #currentSession() {
        const monitors = Main.layoutManager.monitors.map(freezeMonitor);
        const captureType = this.#captureType();
        let selection = null;

        if (captureType === CaptureType.WINDOW) {
            // Window geometry stays owned by GNOME.
        } else if (captureType === CaptureType.SCREEN) {
            const monitorIndex = this.#screenshotUi._screenSelectors.findIndex(
                selector => selector.checked
            );
            const monitor = monitors[monitorIndex] ??
                monitors[Main.layoutManager.primaryIndex] ?? monitors[0];
            if (monitor)
                selection = Object.freeze({...monitor});
        } else if (
            this.#selectionLifecycle.areaState === AreaState.SELECTED
        ) {
            const [x, y, width, height] =
                this.#screenshotUi._areaSelector.getGeometry();
            if (width > 0 && height > 0)
                selection = Object.freeze({x, y, width, height});
        }

        return Object.freeze({
            isScreenshot:
                this.#selectionLifecycle.mode === ScreenshotMode.SCREENSHOT,
            captureType,
            areaState: this.#selectionLifecycle.areaState,
            selection,
            monitors: Object.freeze(monitors),
            outputScale: Number.isFinite(this.#screenshotUi._scale)
                ? this.#screenshotUi._scale
                : 1,
        });
    }

    #invokeSafely(callback, eventName, ...args) {
        if (typeof callback !== 'function')
            return;

        try {
            callback(...args);
        } catch (error) {
            console.error(
                `Compact Capture failed while handling ScreenshotUI ${eventName}`,
                error
            );
        }
    }
}
