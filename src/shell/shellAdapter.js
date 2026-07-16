// SPDX-License-Identifier: GPL-3.0-only

import {InjectionManager} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Config from 'resource:///org/gnome/shell/misc/config.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {inspectScreenshotUi} from './screenshotUiContract.js';

export class ScreenshotUiAdapter {
    #active = false;
    #closedSignalId = 0;
    #compatibility = null;
    #injectionManager = null;
    #modeSignalId = 0;
    #onClosed;
    #onModeChanged;
    #onOpened;
    #screenshotUi;
    #screenshotUiPrototype;
    #sessionOpen = false;

    constructor({
        onOpened = null,
        onClosed = null,
        onModeChanged = null,
    } = {}) {
        this.#screenshotUi = Main.screenshotUI;
        this.#screenshotUiPrototype = this.#screenshotUi
            ? Object.getPrototypeOf(this.#screenshotUi)
            : null;
        this.#onOpened = onOpened;
        this.#onClosed = onClosed;
        this.#onModeChanged = onModeChanged;
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
        let closedSignalId = 0;
        let modeSignalId = 0;

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

            closedSignalId = this.#screenshotUi.connect(
                'closed',
                () => this.#handleClosed()
            );
            modeSignalId = this.#screenshotUi._shotButton.connect(
                'notify::checked',
                () => this.#handleModeChanged()
            );

            this.#injectionManager = injectionManager;
            this.#closedSignalId = closedSignalId;
            this.#modeSignalId = modeSignalId;
            this.#sessionOpen = false;
            this.#active = true;
            return true;
        } catch (error) {
            if (modeSignalId) {
                try {
                    this.#screenshotUi._shotButton.disconnect(modeSignalId);
                } catch (disconnectError) {
                    console.error(
                        'Compact Capture could not roll back its mode signal',
                        disconnectError
                    );
                }
            }
            if (closedSignalId) {
                try {
                    this.#screenshotUi.disconnect(closedSignalId);
                } catch (disconnectError) {
                    console.error(
                        'Compact Capture could not roll back its closed signal',
                        disconnectError
                    );
                }
            }

            injectionManager.clear();
            console.error(
                'Compact Capture could not enable its ScreenshotUI adapter',
                error
            );
            return false;
        }
    }

    disable() {
        if (this.#modeSignalId) {
            try {
                this.#screenshotUi._shotButton.disconnect(this.#modeSignalId);
            } catch (error) {
                console.error(
                    'Compact Capture could not disconnect its mode signal',
                    error
                );
            }
            this.#modeSignalId = 0;
        }

        if (this.#closedSignalId) {
            try {
                this.#screenshotUi.disconnect(this.#closedSignalId);
            } catch (error) {
                console.error(
                    'Compact Capture could not disconnect its closed signal',
                    error
                );
            }
            this.#closedSignalId = 0;
        }

        this.#injectionManager?.clear();
        this.#injectionManager = null;
        this.#sessionOpen = false;
        this.#active = false;
    }

    mountToolbar(toolbar) {
        if (!this.#active || !this.#sessionOpen || !toolbar)
            return false;

        const toolbarHost = this.#screenshotUi._primaryMonitorBin;
        const actors = [toolbar, ...(toolbar.auxiliaryActors ?? [])];
        const mountedActors = [];
        try {
            if (toolbar.get_parent?.() === toolbarHost) {
                return actors.every(
                    actor => actor.get_parent?.() === toolbarHost
                );
            }
            if (toolbar.get_parent?.())
                return false;

            for (const actor of actors) {
                if (actor.get_parent?.())
                    throw new Error('Toolbar actor already has a parent');
                toolbarHost.add_child(actor);
                mountedActors.push(actor);
            }
            if (!actors.every(actor => actor.get_parent?.() === toolbarHost))
                throw new Error('Toolbar actor was not mounted');
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

    unmountToolbar(toolbar) {
        if (!toolbar)
            return;

        const toolbarHost = this.#screenshotUi?._primaryMonitorBin;
        const actors = [toolbar, ...(toolbar.auxiliaryActors ?? [])];
        for (const actor of actors.reverse()) {
            try {
                if (actor.get_parent?.() === toolbarHost)
                    toolbarHost.remove_child(actor);
            } catch (error) {
                console.error(
                    'Compact Capture could not unmount a toolbar actor',
                    error
                );
            }
        }
    }

    #handleOpenCompleted() {
        if (!this.#active || this.#sessionOpen || !this.#screenshotUi.visible)
            return;

        this.#sessionOpen = true;
        this.#invokeSafely(
            this.#onOpened,
            'opened',
            this.#currentSession()
        );
    }

    #handleClosed() {
        if (!this.#active || !this.#sessionOpen)
            return;

        this.#sessionOpen = false;
        this.#invokeSafely(this.#onClosed, 'closed');
    }

    #handleModeChanged() {
        if (!this.#active || !this.#sessionOpen || !this.#screenshotUi.visible)
            return;

        this.#invokeSafely(
            this.#onModeChanged,
            'mode change',
            this.#currentSession()
        );
    }

    #currentSession() {
        return Object.freeze({
            isScreenshot: this.#screenshotUi._shotButton.checked,
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
