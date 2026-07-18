// SPDX-License-Identifier: GPL-3.0-only

import Cairo from 'gi://cairo';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';

import {renderAnnotation} from '../core/annotationRenderer.js';
import {GestureSequence} from '../core/gestureSequence.js';
import {obscureRect} from '../core/obscureDefinitions.js';
import {
    hitTestObscureHandle,
    obscureHandles,
    resizeObscureFromHandle,
} from '../core/obscureSelection.js';
import {
    DEFAULT_SAMPLE_DISTANCE,
    MAX_STROKE_POINTS,
    shouldSamplePoint,
} from '../core/pointSampler.js';
import {Tool} from '../core/toolDefinitions.js';
import {AnnotationRenderCache} from './annotationRenderCache.js';

const FREEFORM_TOOLS = new Set([Tool.FREEHAND, Tool.HIGHLIGHTER]);
const HANDLE_SIZE = 12;

function touchSequenceSlot(event) {
    return event.get_event_sequence()?.get_slot();
}

const AnnotationCanvas = GObject.registerClass(
class AnnotationCanvas extends St.DrawingArea {
    _init(owner) {
        super._init({
            reactive: false,
            can_focus: false,
            x_expand: true,
            y_expand: true,
        });
        this._owner = owner;
    }

    vfunc_repaint() {
        this._owner._paint(this.get_context(), this.get_resource_scale());
    }
});

function drawSelection(cr, annotation, handles) {
    if (annotation.points.length < 2)
        return;
    const rect = obscureRect(annotation);
    cr.save();
    try {
        cr.setLineWidth(1.5);
        cr.setSourceRGBA(0, 0, 0, 0.7);
        cr.rectangle(rect.x, rect.y, rect.width, rect.height);
        cr.strokePreserve();
        cr.setLineWidth(1);
        cr.setSourceRGBA(1, 1, 1, 1);
        cr.stroke();

        if (!handles)
            return;
        for (const handle of obscureHandles(annotation, HANDLE_SIZE)) {
            cr.arc(
                handle.x + handle.width / 2,
                handle.y + handle.height / 2,
                4.5,
                0,
                Math.PI * 2
            );
            cr.setSourceRGBA(0, 0, 0, 0.75);
            cr.fillPreserve();
            cr.setLineWidth(1.5);
            cr.setSourceRGBA(1, 1, 1, 1);
            cr.stroke();
        }
    } finally {
        cr.restore();
    }
}

export const AnnotationOverlay = GObject.registerClass(
class AnnotationOverlay extends St.Widget {
    _init(params = {}) {
        const {
            document,
            toolbarState,
            stageRect,
            createObscurePreview = null,
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
            clip_to_allocation: true,
            x_expand: false,
            y_expand: false,
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.START,
            ...actorParams,
        });

        this._document = document;
        this._toolbarState = toolbarState;
        this._stageRect = {...stageRect};
        this._createObscurePreview = createObscurePreview;
        this._onDocumentChanged = onDocumentChanged;
        this._drawing = false;
        this._resize = null;
        this._gestureSequence = new GestureSequence();
        this._inputEnabled = true;
        this._dragGrab = null;
        this._lastPoint = null;
        this._pointCount = 0;
        this._activeTool = null;
        this._previewActors = new Map();
        this._renderCache = new AnnotationRenderCache(stageRect);
        this._canvas = new AnnotationCanvas(this);
        this.add_child(this._canvas);

        this.set_position(stageRect.x, stageRect.y);
        this.set_size(stageRect.width, stageRect.height);
        this._canvas.set_position(0, 0);
        this._canvas.set_size(stageRect.width, stageRect.height);
        this.connect('destroy', () => {
            this.cancelGesture();
            this._destroyPreviews();
            this._renderCache.destroy();
        });
    }

    get hasActiveGesture() {
        return this._drawing;
    }

    queueAnnotationRepaint() {
        this._syncPreviews();
        this._canvas.queue_repaint();
    }

    cancelGesture() {
        if (this._drawing && !this._resize)
            this._document.cancelStroke();

        this._resetGesture();
    }

    finishGestureForCapture() {
        if (!this._drawing)
            return false;

        let committed;
        if (this._resize)
            committed = Boolean(this._commitResize());
        else
            committed = this._document.commitStroke();
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

    _paint(cr, resourceScale) {
        try {
            const view = this._document.renderView();
            this._renderCache.paint(cr, view, resourceScale);
            cr.save();
            cr.translate(-this._stageRect.x, -this._stageRect.y);

            if (view.draft) {
                if (view.draft.tool === Tool.OBSCURE)
                    drawSelection(cr, view.draft, false);
                else
                    renderAnnotation(cr, view.draft);
            }

            const active = this._resize?.preview ?? this._activeObscure();
            if (active)
                drawSelection(cr, active, true);
            cr.restore();
        } finally {
            cr.$dispose();
        }
    }

    _activeObscure() {
        const stroke = this._document.lastCommitted;
        return this._toolbarState.tool === Tool.OBSCURE &&
            stroke?.tool === Tool.OBSCURE
            ? stroke
            : null;
    }

    _beginGesture([x, y]) {
        const point = {x, y};
        const active = this._activeObscure();
        const handle = active
            ? hitTestObscureHandle(active, point, HANDLE_SIZE)
            : null;
        if (handle) {
            this._resize = {handle, original: active, preview: active};
            this._drawing = true;
            this._activeTool = Tool.OBSCURE;
            this._dragGrab = global.stage.grab(this);
            this.queueAnnotationRepaint();
            return true;
        }

        const style = this._toolbarState.snapshot();
        const started = this._document.beginStroke({
            tool: style.tool,
            color: style.color,
            width: style.lineWidth,
            point,
            obscureTreatment: style.obscureTreatment,
            obscureIntensity: style.obscureIntensity,
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
        if (this._resize) {
            const points = resizeObscureFromHandle(
                this._resize.original,
                this._resize.handle,
                point
            );
            this._resize.preview = {
                ...this._resize.original,
                points: [points.start, points.end],
            };
            this._canvas.queue_repaint();
            return;
        }

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
        if (this._resize)
            this._commitResize();
        else
            this._document.commitStroke();
        this._resetGesture();
        this._notifyDocumentChanged();
    }

    _commitResize() {
        const preview = this._resize?.preview;
        if (!preview)
            return null;
        return this._document.replaceLastObscure({
            start: preview.points[0],
            end: preview.points.at(-1),
        });
    }

    _resetGesture() {
        this._drawing = false;
        this._resize = null;
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

    _syncPreviews() {
        const visible = new Set();
        for (const stroke of this._document.renderView().committed) {
            if (stroke.tool !== Tool.OBSCURE)
                continue;
            visible.add(stroke);
            if (!this._previewActors.has(stroke))
                this._addPreview(stroke);
        }

        for (const [stroke, actor] of this._previewActors) {
            if (visible.has(stroke))
                continue;
            this._previewActors.delete(stroke);
            actor?.destroy();
        }
    }

    _addPreview(stroke) {
        if (typeof this._createObscurePreview !== 'function')
            return;
        try {
            const preview = this._createObscurePreview(
                stroke,
                this._stageRect
            );
            if (!preview) {
                this._previewActors.set(stroke, null);
                return;
            }
            const actor = new St.Widget({
                reactive: false,
                content: preview.content,
                content_gravity: Clutter.ContentGravity.RESIZE_FILL,
            });
            actor.set_content_scaling_filters(
                preview.scalingFilter,
                preview.scalingFilter
            );
            actor.set_position(
                preview.logicalRect.x - this._stageRect.x,
                preview.logicalRect.y - this._stageRect.y
            );
            actor.set_size(
                preview.logicalRect.width,
                preview.logicalRect.height
            );
            this.insert_child_below(actor, this._canvas);
            this._previewActors.set(stroke, actor);
        } catch (error) {
            this._previewActors.set(stroke, null);
            console.error('Compact Capture could not preview an obscure region', error);
        }
    }

    _destroyPreviews() {
        for (const actor of this._previewActors.values())
            actor?.destroy();
        this._previewActors.clear();
    }

    _notifyDocumentChanged() {
        if (typeof this._onDocumentChanged === 'function')
            this._onDocumentChanged();
        else
            this.queueAnnotationRepaint();
    }
});
