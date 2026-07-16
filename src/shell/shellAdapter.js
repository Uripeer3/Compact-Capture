// SPDX-License-Identifier: GPL-3.0-only

import {InjectionManager} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Config from 'resource:///org/gnome/shell/misc/config.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {inspectScreenshotUi} from './screenshotUiContract.js';

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

    constructor({
        onOpened = null,
        onClosed = null,
        onModeChanged = null,
        onCaptureChanged = null,
        onSelectionStarted = null,
        onSelectionChanged = null,
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
        this.#disconnectAll(this.#connections);
        this.#connections = [];
        this.#injectionManager?.clear();
        this.#injectionManager = null;
        this.#sessionOpen = false;
        this.#lastCaptureType = null;
        this.#active = false;
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
        const session = this.#currentSession();
        this.#lastCaptureType = session.captureType;
        this.#invokeSafely(this.#onOpened, 'opened', session);
    }

    #handleClosed() {
        if (!this.#active || !this.#sessionOpen)
            return;

        this.#sessionOpen = false;
        this.#lastCaptureType = null;
        this.#invokeSafely(this.#onClosed, 'closed');
    }

    #handleModeChanged() {
        if (!this.#canDispatch())
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

        const session = this.#currentSession();
        if (session.captureType === this.#lastCaptureType)
            return;

        this.#lastCaptureType = session.captureType;
        this.#invokeSafely(
            this.#onCaptureChanged,
            'capture type change',
            session
        );
    }

    #handleSelectionStarted() {
        if (!this.#canDispatch())
            return;
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

    #currentSession() {
        const monitors = Main.layoutManager.monitors.map(freezeMonitor);
        let captureType = 'selection';
        let selection = null;

        if (this.#screenshotUi._windowButton.checked) {
            captureType = 'window';
        } else if (this.#screenshotUi._screenButton.checked) {
            captureType = 'screen';
            const monitorIndex = this.#screenshotUi._screenSelectors.findIndex(
                selector => selector.checked
            );
            const monitor = monitors[monitorIndex] ??
                monitors[Main.layoutManager.primaryIndex] ?? monitors[0];
            if (monitor)
                selection = Object.freeze({...monitor});
        } else {
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
