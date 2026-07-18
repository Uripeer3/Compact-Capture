// SPDX-License-Identifier: GPL-3.0-only

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {AnnotationDocument} from './core/annotationDocument.js';
import {
    drawingRects,
    monitorForRect,
    placeToolbar,
} from './core/geometry.js';
import {ShortcutAction} from './core/keyboardShortcuts.js';
import {ToolbarState} from './core/toolbarState.js';
import {ScreenshotUiAdapter} from './shell/shellAdapter.js';
import {AnnotationOverlay} from './ui/annotationOverlay.js';
import {CompactToolbar} from './ui/compactToolbar.js';
import {SelectionHint} from './ui/selectionHint.js';

const DRAWING_GUTTER = 8;

export default class CompactCaptureExtension extends Extension {
    enable() {
        this._document = new AnnotationDocument();
        this._toolbarState = new ToolbarState();
        this._toolbar = null;
        this._selectionHint = null;
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
                this._hideSelectionHint();
            },
            onSelectionChanged: session => {
                if (session.captureType !== 'selection')
                    return;
                this._awaitingAreaSelection = false;
                this._refreshSession(session);
            },
            onShortcut: action => this._handleShortcut(action),
            getAnnotations: () => this._document.snapshot(),
            onClosed: () => {
                this._hideAnnotationUi();
                this._hideSelectionHint();
                this._document.clear();
                this._session = null;
                this._awaitingAreaSelection = true;
            },
        });
        this._shellAdapter.enable();
    }

    disable() {
        this._hideAnnotationUi();
        this._hideSelectionHint();
        this._shellAdapter?.disable();
        this._shellAdapter = null;

        this._document?.clear();
        this._document = null;
        this._toolbarState = null;
        this._session = null;
    }

    _refreshSession(session) {
        this._session = session;
        if (session.captureType === 'selection' && !session.selection)
            this._awaitingAreaSelection = true;

        const supported = session.isScreenshot &&
            session.captureType !== 'window' &&
            session.selection !== null;
        const waiting = session.captureType === 'selection' &&
            this._awaitingAreaSelection;

        if (!supported || waiting) {
            this._hideAnnotationUi();
            if (session.isScreenshot && waiting)
                this._showSelectionHint();
            else
                this._hideSelectionHint();
            return;
        }

        this._hideSelectionHint();
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
            this._undo();
        });
        toolbar.connect('redo', () => {
            this._redo();
        });
        toolbar.connect('clear', () => {
            this._clear();
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

    _showSelectionHint() {
        if (this._selectionHint)
            return;

        const hint = new SelectionHint();
        if (!this._shellAdapter.mountSelectionHint(hint)) {
            hint.destroy();
            return;
        }

        this._selectionHint = hint;
    }

    _hideSelectionHint() {
        if (!this._selectionHint)
            return;

        this._shellAdapter?.unmountSelectionHint(this._selectionHint);
        this._selectionHint.destroy();
        this._selectionHint = null;
    }

    _repaintOverlays() {
        for (const overlay of this._overlays)
            overlay.queue_repaint();
        this._syncToolbarActions();
    }

    _syncToolbarActions() {
        this._toolbar?.setActionSensitivity({
            canUndo: this._document.canUndo,
            canRedo: this._document.canRedo,
            canClear: this._document.hasAnnotations ||
                this._document.isDrawing,
        });
    }

    _handleShortcut(action) {
        let handled = false;
        if (action === ShortcutAction.UNDO)
            handled = this._undo();
        else if (action === ShortcutAction.REDO)
            handled = this._redo();
        return handled;
    }

    _undo() {
        let changed;
        if (this._document.isDrawing) {
            this._cancelActiveGestures();
            changed = true;
        } else {
            changed = this._document.undo();
        }

        if (changed)
            this._repaintOverlays();
        return changed;
    }

    _redo() {
        const changed = this._document.redo();
        if (changed)
            this._repaintOverlays();
        return changed;
    }

    _clear() {
        const changed = this._document.hasAnnotations ||
            this._document.isDrawing;
        this._cancelActiveGestures();
        this._document.clear();
        if (changed)
            this._repaintOverlays();
        return changed;
    }

    _cancelActiveGestures() {
        for (const overlay of this._overlays)
            overlay.cancelGesture();
    }
}
