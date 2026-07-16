// SPDX-License-Identifier: GPL-3.0-only

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {AnnotationDocument} from './annotationDocument.js';

export default class CompactCaptureExtension extends Extension {
    enable() {
        // PR 1 intentionally has no Shell integration. Keeping the model owned
        // by the extension establishes the lifecycle boundary for PR 2.
        this._document = new AnnotationDocument();
    }

    disable() {
        this._document = null;
    }
}

