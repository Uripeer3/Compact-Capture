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
    #onClosed;
    #onOpened;
    #screenshotUi;
    #screenshotUiPrototype;
    #sessionOpen = false;

    constructor({onOpened = null, onClosed = null} = {}) {
        this.#screenshotUi = Main.screenshotUI;
        this.#screenshotUiPrototype = this.#screenshotUi
            ? Object.getPrototypeOf(this.#screenshotUi)
            : null;
        this.#onOpened = onOpened;
        this.#onClosed = onClosed;
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

            this.#injectionManager = injectionManager;
            this.#closedSignalId = closedSignalId;
            this.#sessionOpen = false;
            this.#active = true;
            return true;
        } catch (error) {
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

    #handleOpenCompleted() {
        if (!this.#active || this.#sessionOpen || !this.#screenshotUi.visible)
            return;

        this.#sessionOpen = true;
        this.#invokeSafely(this.#onOpened, 'opened');
    }

    #handleClosed() {
        if (!this.#active || !this.#sessionOpen)
            return;

        this.#sessionOpen = false;
        this.#invokeSafely(this.#onClosed, 'closed');
    }

    #invokeSafely(callback, eventName) {
        if (typeof callback !== 'function')
            return;

        try {
            callback();
        } catch (error) {
            console.error(
                `Compact Capture failed while handling ScreenshotUI ${eventName}`,
                error
            );
        }
    }
}
