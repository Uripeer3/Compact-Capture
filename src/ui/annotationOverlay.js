// SPDX-License-Identifier: GPL-3.0-only

import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';

import {renderAnnotation} from '../core/annotationRenderer.js';
import {GestureSequence} from '../core/gestureSequence.js';
import {
    DEFAULT_SAMPLE_DISTANCE,
    MAX_STROKE_POINTS,
    shouldSamplePoint,
} from '../core/pointSampler.js';
import {Tool} from '../core/toolDefinitions.js';
import {AnnotationRenderCache} from './annotationRenderCache.js';

const FREEFORM_TOOLS = new Set([Tool.FREEHAND, Tool.HIGHLIGHTER]);

function touchSequenceSlot(event) {
    return event.get_event_sequence()?.get_slot();
}

export const AnnotationOverlay = GObject.registerClass(
class AnnotationOverlay extends St.DrawingArea {
    _init(params = {}) {
        const {
            document,
            toolbarState,
            stageRect,
            onDocumentChanged = null,
            ...actorParams
        } = params;

        if (!document || !toolbarState) {
            throw new TypeError(
                'AnnotationOverlay requires document and toolbar state'
            );
        }

        super._init({
            reactive: true,
            can_focus: false,
            x_expand: false,
            y_expand: false,
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.START,
            ...actorParams,
        });

        this._document = document;
        this._toolbarState = toolbarState;
        this._stageRect = {...stageRect};
        this._onDocumentChanged = onDocumentChanged;
        this._drawing = false;
        this._gestureSequence = new GestureSequence();
        this._inputEnabled = true;
        this._dragGrab = null;
        this._lastPoint = null;
        this._pointCount = 0;
        this._activeTool = null;
        this._renderCache = new AnnotationRenderCache(stageRect);

        this.set_position(stageRect.x, stageRect.y);
        this.set_size(stageRect.width, stageRect.height);
        this.connect('destroy', () => {
            this.cancelGesture();
            this._renderCache.destroy();
        });
    }

    cancelGesture() {
        if (this._drawing)
            this._document.cancelStroke();

        this._resetGesture();
    }

    finishGestureForCapture() {
        if (!this._drawing)
            return false;

        const committed = this._document.commitStroke();
        this._resetGesture();
        this._notifyDocumentChanged();
        return committed;
    }

    setInputEnabled(enabled) {
        this._inputEnabled = Boolean(enabled);
        this.reactive = this._inputEnabled;
    }

    vfunc_button_press_event(event) {
        if (!this._inputEnabled || this._drawing ||
            event.get_button() !== Clutter.BUTTON_PRIMARY) {
            return Clutter.EVENT_PROPAGATE;
        }

        if (!this._beginGesture(event.get_coords()))
            return Clutter.EVENT_PROPAGATE;
        this._gestureSequence.beginPointer(event.get_button());
        return Clutter.EVENT_STOP;
    }

    vfunc_button_release_event(event) {
        if (!this._inputEnabled || !this._drawing ||
            !this._gestureSequence.ownsPointer(event.get_button())) {
            return Clutter.EVENT_PROPAGATE;
        }

        this._finishGesture(event.get_coords());
        return Clutter.EVENT_STOP;
    }

    vfunc_motion_event(event) {
        if (!this._inputEnabled || !this._drawing ||
            !this._gestureSequence.isPointer) {
            return Clutter.EVENT_PROPAGATE;
        }

        this._updateGesture(event.get_coords());
        return Clutter.EVENT_STOP;
    }

    vfunc_touch_event(event) {
        const eventType = event.type();
        if (eventType === Clutter.EventType.TOUCH_BEGIN) {
            if (!this._inputEnabled || this._drawing)
                return Clutter.EVENT_PROPAGATE;
            const sequenceSlot = touchSequenceSlot(event);
            if (sequenceSlot === null || sequenceSlot === undefined)
                return Clutter.EVENT_PROPAGATE;
            if (!this._beginGesture(event.get_coords()))
                return Clutter.EVENT_PROPAGATE;
            this._gestureSequence.beginTouch(sequenceSlot);
            return Clutter.EVENT_STOP;
        }

        if (!this._inputEnabled || !this._drawing ||
            !this._gestureSequence.ownsTouch(touchSequenceSlot(event))) {
            return Clutter.EVENT_PROPAGATE;
        }

        if (eventType === Clutter.EventType.TOUCH_UPDATE) {
            this._updateGesture(event.get_coords());
            return Clutter.EVENT_STOP;
        }

        if (eventType === Clutter.EventType.TOUCH_END) {
            this._finishGesture(event.get_coords());
            return Clutter.EVENT_STOP;
        }

        if (eventType === Clutter.EventType.TOUCH_CANCEL) {
            this.cancelGesture();
            this._notifyDocumentChanged();
            return Clutter.EVENT_STOP;
        }

        return Clutter.EVENT_PROPAGATE;
    }

    vfunc_repaint() {
        const cr = this.get_context();
        try {
            const view = this._document.renderView();
            this._renderCache.paint(cr, view, this.get_resource_scale());

            if (view.draft) {
                cr.save();
                cr.translate(-this._stageRect.x, -this._stageRect.y);
                renderAnnotation(cr, view.draft);
                cr.restore();
            }
        } finally {
            cr.$dispose();
        }
    }

    _beginGesture([x, y]) {
        const style = this._toolbarState.snapshot();
        const point = {x, y};
        const started = this._document.beginStroke({
            tool: style.tool,
            color: style.color,
            width: style.lineWidth,
            point,
        });
        if (!started)
            return false;

        this._drawing = true;
        this._activeTool = style.tool;
        this._lastPoint = point;
        this._pointCount = 1;
        this._dragGrab = global.stage.grab(this);
        this._notifyDocumentChanged();
        return true;
    }

    _updateGesture([x, y], force = false) {
        const point = {x, y};
        const tool = this._activeTool;

        if (!FREEFORM_TOOLS.has(tool)) {
            if (point.x === this._lastPoint.x && point.y === this._lastPoint.y)
                return;
            this._document.replaceEndPoint(point);
            this._lastPoint = point;
            this._pointCount = 2;
            this._notifyDocumentChanged();
            return;
        }

        if (!force && !shouldSamplePoint(
            this._lastPoint,
            point,
            DEFAULT_SAMPLE_DISTANCE
        )) {
            return;
        }

        if (this._pointCount < MAX_STROKE_POINTS &&
            this._document.canAppendPoint) {
            if (this._document.appendPoint(point))
                this._pointCount++;
        } else {
            this._document.replaceEndPoint(point);
        }
        this._lastPoint = point;
        this._notifyDocumentChanged();
    }

    _finishGesture(coords) {
        this._updateGesture(coords, true);
        this._document.commitStroke();
        this._resetGesture();
        this._notifyDocumentChanged();
    }

    _resetGesture() {
        this._drawing = false;
        this._gestureSequence.clear();
        this._lastPoint = null;
        this._pointCount = 0;
        this._activeTool = null;
        this._releaseGrab();
    }

    _releaseGrab() {
        this._dragGrab?.dismiss();
        this._dragGrab = null;
    }

    _notifyDocumentChanged() {
        if (typeof this._onDocumentChanged === 'function')
            this._onDocumentChanged();
    }
});
