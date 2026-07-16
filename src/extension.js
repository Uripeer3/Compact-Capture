// SPDX-License-Identifier: GPL-3.0-only

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {AnnotationDocument} from './annotationDocument.js';
import {CompactToolbar} from './compactToolbar.js';
import {ScreenshotUiAdapter} from './shellAdapter.js';
import {ToolbarState} from './toolbarState.js';

export default class CompactCaptureExtension extends Extension {
    enable() {
        this._document = new AnnotationDocument();
        this._toolbarState = new ToolbarState();
        this._toolbar = null;
        this._shellAdapter = new ScreenshotUiAdapter({
            onOpened: session => {
                this._document.clear();
                this._syncToolbarVisibility(session.isScreenshot);
            },
            onModeChanged: session =>
                this._syncToolbarVisibility(session.isScreenshot),
            onClosed: () => {
                this._hideToolbar();
                this._document.clear();
            },
        });
        this._shellAdapter.enable();
    }

    disable() {
        this._hideToolbar();
        this._shellAdapter?.disable();
        this._shellAdapter = null;

        this._document?.clear();
        this._document = null;
        this._toolbarState = null;
    }

    _syncToolbarVisibility(isScreenshot) {
        if (isScreenshot)
            this._showToolbar();
        else
            this._hideToolbar();
    }

    _showToolbar() {
        if (this._toolbar)
            return;

        const toolbar = new CompactToolbar({state: this._toolbarState});
        toolbar.connect('undo', () => {
            this._document.undo();
            this._syncToolbarActions();
        });
        toolbar.connect('clear', () => {
            this._document.clear();
            this._syncToolbarActions();
        });

        if (!this._shellAdapter.mountToolbar(toolbar)) {
            toolbar.destroy();
            return;
        }

        this._toolbar = toolbar;
        this._syncToolbarActions();
    }

    _hideToolbar() {
        if (!this._toolbar)
            return;

        this._shellAdapter?.unmountToolbar(this._toolbar);
        this._toolbar.destroy();
        this._toolbar = null;
    }

    _syncToolbarActions() {
        this._toolbar?.setActionSensitivity({
            canUndo: this._document.hasAnnotations,
            canClear: this._document.hasAnnotations,
        });
    }
}
