// SPDX-License-Identifier: GPL-3.0-only

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {AnnotationDocument} from './core/annotationDocument.js';
import {
    drawingRects,
    monitorForRect,
    placeToolbar,
} from './core/geometry.js';
import {ToolbarState} from './core/toolbarState.js';
import {ScreenshotUiAdapter} from './shell/shellAdapter.js';
import {AnnotationOverlay} from './ui/annotationOverlay.js';
import {CompactToolbar} from './ui/compactToolbar.js';

const DRAWING_GUTTER = 8;

export default class CompactCaptureExtension extends Extension {
    enable() {
        this._document = new AnnotationDocument();
        this._toolbarState = new ToolbarState();
        this._toolbar = null;
        this._overlays = [];
        this._session = null;
        this._awaitingAreaSelection = true;

        this._shellAdapter = new ScreenshotUiAdapter({
            onOpened: session => {
                this._document.clear();
                this._awaitingAreaSelection =
                    session.captureType === 'selection';
                this._refreshSession(session);
            },
            onModeChanged: session => this._refreshSession(session),
            onCaptureChanged: session => {
                this._document.clear();
                this._awaitingAreaSelection =
                    session.captureType === 'selection';
                this._refreshSession(session);
            },
            onSelectionStarted: () => {
                this._document.clear();
                this._awaitingAreaSelection = true;
                this._hideAnnotationUi();
            },
            onSelectionChanged: session => {
                if (session.captureType !== 'selection')
                    return;
                this._awaitingAreaSelection = false;
                this._refreshSession(session);
            },
            onClosed: () => {
                this._hideAnnotationUi();
                this._document.clear();
                this._session = null;
                this._awaitingAreaSelection = true;
            },
        });
        this._shellAdapter.enable();
    }

    disable() {
        this._hideAnnotationUi();
        this._shellAdapter?.disable();
        this._shellAdapter = null;

        this._document?.clear();
        this._document = null;
        this._toolbarState = null;
        this._session = null;
    }

    _refreshSession(session) {
        this._session = session;
        const supported = session.isScreenshot &&
            session.captureType !== 'window' &&
            session.selection !== null;
        const waiting = session.captureType === 'selection' &&
            this._awaitingAreaSelection;

        if (!supported || waiting) {
            this._hideAnnotationUi();
            return;
        }

        this._rebuildAnnotationUi();
    }

    _rebuildAnnotationUi() {
        this._hideAnnotationUi();
        const session = this._session;
        if (!session?.selection)
            return;

        const toolbarMonitor = monitorForRect(
            session.monitors,
            session.selection
        );
        if (!toolbarMonitor)
            return;

        const toolbar = new CompactToolbar({
            state: this._toolbarState,
            extensionPath: this.path,
        });
        toolbar.connect('undo', () => {
            this._document.undo();
            this._repaintOverlays();
        });
        toolbar.connect('clear', () => {
            this._document.clear();
            this._repaintOverlays();
        });

        if (!this._shellAdapter.mountToolbar(toolbar)) {
            toolbar.destroy();
            return;
        }

        this._toolbar = toolbar;
        this._placeToolbar(toolbarMonitor);

        for (const stageRect of drawingRects(
            session.selection,
            session.monitors,
            DRAWING_GUTTER
        )) {
            const overlay = new AnnotationOverlay({
                document: this._document,
                toolbarState: this._toolbarState,
                stageRect,
                onDocumentChanged: () => this._repaintOverlays(),
            });
            if (this._shellAdapter.mountOverlay(overlay))
                this._overlays.push(overlay);
            else
                overlay.destroy();
        }

        this._syncToolbarActions();
    }

    _placeToolbar(monitor) {
        const [, toolbarWidth] = this._toolbar.get_preferred_width(-1);
        const [, toolbarHeight] =
            this._toolbar.get_preferred_height(toolbarWidth);
        const placement = placeToolbar({
            selection: this._session.selection,
            monitor,
            toolbar: {width: toolbarWidth, height: toolbarHeight},
        });
        this._shellAdapter.placeToolbar(this._toolbar, placement);
    }

    _hideAnnotationUi() {
        for (const overlay of this._overlays.splice(0)) {
            this._shellAdapter?.unmountOverlay(overlay);
            overlay.destroy();
        }

        if (!this._toolbar)
            return;

        this._shellAdapter?.unmountToolbar(this._toolbar);
        this._toolbar.destroy();
        this._toolbar = null;
    }

    _repaintOverlays() {
        for (const overlay of this._overlays)
            overlay.queue_repaint();
        this._syncToolbarActions();
    }

    _syncToolbarActions() {
        this._toolbar?.setActionSensitivity({
            canUndo: this._document.hasAnnotations,
            canClear: this._document.hasAnnotations,
        });
    }
}
