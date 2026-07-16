// SPDX-License-Identifier: GPL-3.0-only

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {AnnotationDocument} from './annotationDocument.js';
import {ScreenshotUiAdapter} from './shellAdapter.js';

export default class CompactCaptureExtension extends Extension {
    enable() {
        this._document = new AnnotationDocument();
        this._shellAdapter = new ScreenshotUiAdapter({
            onOpened: () => this._document.clear(),
            onClosed: () => this._document.clear(),
        });
        this._shellAdapter.enable();
    }

    disable() {
        this._shellAdapter?.disable();
        this._shellAdapter = null;

        this._document?.clear();
        this._document = null;
    }
}

