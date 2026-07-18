// SPDX-License-Identifier: GPL-3.0-only

import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';

import {renderAnnotations} from '../core/annotationRenderer.js';
import {
    DEFAULT_SAMPLE_DISTANCE,
    MAX_STROKE_POINTS,
    shouldSamplePoint,
} from '../core/pointSampler.js';
import {Tool} from '../core/toolDefinitions.js';

const FREEFORM_TOOLS = new Set([Tool.FREEHAND, Tool.HIGHLIGHTER]);

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
        this._dragButton = 0;
        this._dragGrab = null;
        this._capturedEventId = 0;
        this._lastPoint = null;
        this._pointCount = 0;
        this._activeTool = null;

        this.set_position(stageRect.x, stageRect.y);
        this.set_size(stageRect.width, stageRect.height);
        this.connect('destroy', () => this.cancelGesture());
    }

    cancelGesture() {
        if (this._drawing)
            this._document.cancelStroke();

        this._drawing = false;
        this._dragButton = 0;
        this._lastPoint = null;
        this._pointCount = 0;
        this._activeTool = null;
        this._disconnectCapturedEvent();
        this._releaseGrab();
    }

    vfunc_button_press_event(event) {
        if (this._drawing || event.get_button() !== Clutter.BUTTON_PRIMARY)
            return Clutter.EVENT_PROPAGATE;

        this._dragButton = event.get_button();
        this._beginGesture(event.get_coords());
        return Clutter.EVENT_STOP;
    }

    vfunc_button_release_event(event) {
        if (!this._drawing || event.get_button() !== this._dragButton)
            return Clutter.EVENT_PROPAGATE;

        this._finishGesture(event.get_coords());
        return Clutter.EVENT_STOP;
    }

    vfunc_motion_event(event) {
        if (!this._drawing)
            return Clutter.EVENT_PROPAGATE;

        this._updateGesture(event.get_coords());
        return Clutter.EVENT_STOP;
    }

    vfunc_touch_event(event) {
        const eventType = event.type();
        if (eventType === Clutter.EventType.TOUCH_BEGIN) {
            if (this._drawing)
                return Clutter.EVENT_PROPAGATE;
            this._dragButton = 'touch';
            this._beginGesture(event.get_coords());
            return Clutter.EVENT_STOP;
        }

        if (eventType === Clutter.EventType.TOUCH_UPDATE && this._drawing) {
            this._updateGesture(event.get_coords());
            return Clutter.EVENT_STOP;
        }

        if (eventType === Clutter.EventType.TOUCH_END && this._drawing) {
            this._finishGesture(event.get_coords());
            return Clutter.EVENT_STOP;
        }

        if (eventType === Clutter.EventType.TOUCH_CANCEL && this._drawing) {
            this.cancelGesture();
            this._notifyDocumentChanged();
            return Clutter.EVENT_STOP;
        }

        return Clutter.EVENT_PROPAGATE;
    }

    vfunc_repaint() {
        const cr = this.get_context();
        cr.save();
        cr.translate(-this._stageRect.x, -this._stageRect.y);
        renderAnnotations(
            cr,
            this._document.snapshot({includeDraft: true})
        );
        cr.restore();
        cr.$dispose();
    }

    _beginGesture([x, y]) {
        const style = this._toolbarState.snapshot();
        const point = {x, y};
        this._document.beginStroke({
            tool: style.tool,
            color: style.color,
            width: style.lineWidth,
            point,
        });
        this._drawing = true;
        this._activeTool = style.tool;
        this._lastPoint = point;
        this._pointCount = 1;
        this._dragGrab = global.stage.grab(this);
        this._capturedEventId = global.stage.connect(
            'captured-event',
            (_actor, event) => this._onCapturedEvent(event)
        );
        this._notifyDocumentChanged();
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

        if (this._pointCount < MAX_STROKE_POINTS) {
            this._document.appendPoint(point);
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
        this._drawing = false;
        this._dragButton = 0;
        this._lastPoint = null;
        this._pointCount = 0;
        this._activeTool = null;
        this._disconnectCapturedEvent();
        this._releaseGrab();
        this._notifyDocumentChanged();
    }

    _onCapturedEvent(event) {
        if (event.type() !== Clutter.EventType.KEY_PRESS ||
            event.get_key_symbol() !== Clutter.KEY_Escape) {
            return Clutter.EVENT_PROPAGATE;
        }

        this.cancelGesture();
        this._notifyDocumentChanged();
        return Clutter.EVENT_STOP;
    }

    _disconnectCapturedEvent() {
        if (!this._capturedEventId)
            return;

        global.stage.disconnect(this._capturedEventId);
        this._capturedEventId = 0;
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
