// SPDX-License-Identifier: GPL-3.0-only

import Clutter from 'gi://Clutter';

import {InjectionManager} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Config from 'resource:///org/gnome/shell/misc/config.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {
    AnnotationOutputActor,
    createAnnotationOutput,
} from './outputRenderer.js';
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
        displayScale: Number.isFinite(monitor.geometry_scale)
            ? monitor.geometry_scale
            : 1,
    });
}

export class ScreenshotUiAdapter {
    #active = false;
    #compatibility = null;
    #connections = [];
    #emptySelection = false;
    #emptySelectionOnScreenshotReturn = false;
    #injectionManager = null;
    #lastCaptureType = null;
    #onCaptureChanged;
    #onClosed;
    #onModeChanged;
    #onOpened;
    #onSelectionChanged;
    #onSelectionStarted;
    #screenshotUi;
    #screenshotUiPrototype;
    #sessionOpen = false;
    #selectionVisualOpacities = null;
    #captureButtonReactive = null;
    #captureInProgress = null;
    #getAnnotations;

    constructor({
        onOpened = null,
        onClosed = null,
        onModeChanged = null,
        onCaptureChanged = null,
        onSelectionStarted = null,
        onSelectionChanged = null,
        getAnnotations = null,
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
        this.#getAnnotations = getAnnotations;
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

            for (const selector of this.#screenshotUi._screenSelectors) {
                this.#connect(
                    connections,
                    selector,
                    'notify::checked',
                    () => this.#handleScreenSelectionChanged(selector)
                );
            }

            this.#injectionManager = injectionManager;
            this.#connections = connections;
            this.#sessionOpen = false;
            this.#lastCaptureType = null;
            this.#captureInProgress = null;
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
        this.#leaveEmptySelection({resetGeometry: true});
        this.#disconnectAll(this.#connections);
        this.#connections = [];
        this.#injectionManager?.clear();
        this.#injectionManager = null;
        this.#sessionOpen = false;
        this.#lastCaptureType = null;
        this.#emptySelectionOnScreenshotReturn = false;
        this.#captureInProgress = null;
        this.#active = false;
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
        if (this.#screenshotUi._shotButton.checked &&
            this.#captureType() === 'selection') {
            this.#enterEmptySelection();
        }
        const session = this.#currentSession();
        this.#lastCaptureType = session.captureType;
        this.#invokeSafely(this.#onOpened, 'opened', session);
    }

    #handleClosed() {
        if (!this.#active || !this.#sessionOpen)
            return;

        this.#leaveEmptySelection({resetGeometry: false});
        this.#sessionOpen = false;
        this.#lastCaptureType = null;
        this.#emptySelectionOnScreenshotReturn = false;
        this.#invokeSafely(this.#onClosed, 'closed');
    }

    #handleModeChanged() {
        if (!this.#canDispatch())
            return;

        if (!this.#screenshotUi._shotButton.checked && this.#emptySelection) {
            this.#leaveEmptySelection({resetGeometry: true});
            this.#emptySelectionOnScreenshotReturn = true;
        } else if (this.#screenshotUi._shotButton.checked &&
            this.#emptySelectionOnScreenshotReturn) {
            if (this.#captureType() === 'selection')
                this.#enterEmptySelection();
            this.#emptySelectionOnScreenshotReturn = false;
        }

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
        if (captureType === this.#lastCaptureType)
            return;

        if (captureType === 'selection' &&
            this.#screenshotUi._shotButton.checked) {
            this.#enterEmptySelection();
        } else {
            this.#leaveEmptySelection({resetGeometry: true});
            this.#emptySelectionOnScreenshotReturn = false;
        }

        const session = this.#currentSession();
        this.#lastCaptureType = captureType;
        this.#invokeSafely(
            this.#onCaptureChanged,
            'capture type change',
            session
        );
    }

    #handleSelectionStarted() {
        if (!this.#canDispatch())
            return;
        this.#leaveEmptySelection({resetGeometry: false});
        this.#invokeSafely(this.#onSelectionStarted, 'selection drag start');
    }

    #handleSelectionChanged() {
        if (!this.#canDispatch())
            return;
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
        if (!this.#emptySelection || !this.#isCaptureShortcut(event))
            return Clutter.EVENT_PROPAGATE;
        return Clutter.EVENT_STOP;
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
            return 'window';
        if (this.#screenshotUi._screenButton.checked)
            return 'screen';
        return 'selection';
    }

    async #saveScreenshot(screenshotUi, originalMethod, args) {
        if (screenshotUi !== this.#screenshotUi ||
            !this.#active || !this.#sessionOpen ||
            !this.#screenshotUi._shotButton.checked ||
            this.#captureType() === 'window') {
            return originalMethod.apply(screenshotUi, args);
        }

        let strokes;
        try {
            strokes = this.#getAnnotations?.() ?? [];
        } catch (error) {
            console.error(
                'Compact Capture could not read its annotation document',
                error
            );
            return originalMethod.apply(screenshotUi, args);
        }

        if (!Array.isArray(strokes) || strokes.length === 0)
            return originalMethod.apply(screenshotUi, args);
        if (this.#captureInProgress)
            return this.#captureInProgress;

        const session = this.#currentSession();
        if (!session.selection)
            return originalMethod.apply(screenshotUi, args);

        const capture = this.#saveAnnotatedScreenshot(
            screenshotUi,
            originalMethod,
            args,
            strokes,
            session
        );
        this.#captureInProgress = capture;

        try {
            return await capture;
        } finally {
            if (this.#captureInProgress === capture)
                this.#captureInProgress = null;
        }
    }

    async #saveAnnotatedScreenshot(
        screenshotUi,
        originalMethod,
        args,
        strokes,
        session
    ) {
        const cursor = this.#screenshotUi._cursor;
        const originalCursor = {
            content: cursor.content,
            visible: cursor.visible,
            opacity: cursor.opacity,
            x: cursor.x,
            y: cursor.y,
            scale: Number.isFinite(this.#screenshotUi._cursorScale)
                ? this.#screenshotUi._cursorScale
                : 1,
        };
        let delegated = false;

        try {
            const cursorTexture = originalCursor.visible
                ? originalCursor.content?.get_texture?.() ?? null
                : null;
            const outputActor = new AnnotationOutputActor({
                strokes,
                selection: session.selection,
            });
            if (!this.mountOverlay(outputActor)) {
                outputActor.destroy();
                throw new Error('Could not mount the annotation output actor');
            }

            let content;
            try {
                content = outputActor.captureContent();
            } finally {
                this.unmountOverlay(outputActor);
                outputActor.destroy();
            }

            const output = await createAnnotationOutput({
                content,
                selection: session.selection,
                cursor: cursorTexture
                    ? {
                        texture: cursorTexture,
                        x: originalCursor.x,
                        y: originalCursor.y,
                        scale: originalCursor.scale,
                    }
                    : null,
            });

            cursor.set_content(output.content);
            cursor.set_position(output.x, output.y);
            cursor.visible = true;
            // The texture is an output-only bridge; do not flash it inside
            // the still-open screenshot UI while GNOME encodes the image.
            cursor.opacity = 0;
            this.#screenshotUi._cursorScale = output.scale;

            delegated = true;
            return await originalMethod.apply(screenshotUi, args);
        } catch (error) {
            if (delegated)
                throw error;

            console.error(
                'Compact Capture could not prepare annotated output; ' +
                'using GNOME capture unchanged',
                error
            );
            this.#restoreCursor(cursor, originalCursor);
            return await originalMethod.apply(screenshotUi, args);
        } finally {
            this.#restoreCursor(cursor, originalCursor);
        }
    }

    #restoreCursor(cursor, state) {
        cursor.set_content(state.content);
        cursor.set_position(state.x, state.y);
        cursor.visible = state.visible;
        cursor.opacity = state.opacity;
        this.#screenshotUi._cursorScale = state.scale;
    }

    #enterEmptySelection() {
        if (this.#emptySelection)
            return;

        const selector = this.#screenshotUi._areaSelector;
        this.#selectionVisualOpacities = new Map(
            selectionVisualActors(selector).map(actor => [
                actor,
                actor.opacity,
            ])
        );
        this.#captureButtonReactive =
            this.#screenshotUi._captureButton.reactive;

        for (const actor of this.#selectionVisualOpacities.keys())
            actor.opacity = 0;

        // Keep GNOME's selector intact, but move its current rectangle far
        // outside the stage. Its native press handler will consequently start
        // the next gesture as a fresh crosshair selection.
        selector._startX = EMPTY_SELECTION_COORDINATE;
        selector._startY = EMPTY_SELECTION_COORDINATE;
        selector._lastX = EMPTY_SELECTION_COORDINATE;
        selector._lastY = EMPTY_SELECTION_COORDINATE;
        selector._updateSelectionRect();
        // Preserve GNOME's native shade while collapsing only its transparent
        // selection cutout to an effectively invisible corner pixel.
        selector._areaIndicator.setSelectionRect(0, 0, 1, 1);
        selector.set_cursor_type(Clutter.CursorType.CROSSHAIR);
        this.#screenshotUi._captureButton.reactive = false;
        this.#emptySelection = true;
    }

    #leaveEmptySelection({resetGeometry}) {
        if (!this.#emptySelection)
            return;

        const selector = this.#screenshotUi._areaSelector;
        // A native drag has already supplied valid geometry. Other exits need
        // GNOME to rebuild its normal default before we return ownership.
        if (resetGeometry)
            selector.reset();

        for (const [actor, opacity] of this.#selectionVisualOpacities)
            actor.opacity = opacity;
        this.#screenshotUi._captureButton.reactive =
            this.#captureButtonReactive;

        this.#selectionVisualOpacities = null;
        this.#captureButtonReactive = null;
        this.#emptySelection = false;
    }

    #currentSession() {
        const monitors = Main.layoutManager.monitors.map(freezeMonitor);
        let captureType = 'selection';
        let selection = null;

        captureType = this.#captureType();
        if (captureType === 'window') {
            // Window geometry stays owned by GNOME.
        } else if (captureType === 'screen') {
            const monitorIndex = this.#screenshotUi._screenSelectors.findIndex(
                selector => selector.checked
            );
            const monitor = monitors[monitorIndex] ??
                monitors[Main.layoutManager.primaryIndex] ?? monitors[0];
            if (monitor)
                selection = Object.freeze({...monitor});
        } else if (!this.#emptySelection) {
            const [x, y, width, height] =
                this.#screenshotUi._areaSelector.getGeometry();
            if (width > 0 && height > 0)
                selection = Object.freeze({x, y, width, height});
        }

        return Object.freeze({
            isScreenshot: this.#screenshotUi._shotButton.checked,
            captureType,
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
