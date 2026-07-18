// SPDX-License-Identifier: GPL-3.0-only

import Cogl from 'gi://Cogl';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import Shell from 'gi://Shell';
import St from 'gi://St';

import {renderAnnotations} from '../core/annotationRenderer.js';
import {createOutputPlan} from '../core/outputPlan.js';

function coglContext() {
    return global.stage.context.get_backend().get_cogl_context();
}

function contentFromPixbuf(pixbuf) {
    const content = St.ImageContent.new_with_preferred_size(
        pixbuf.width,
        pixbuf.height
    );
    content.set_bytes(
        coglContext(),
        pixbuf.read_pixel_bytes(),
        Cogl.PixelFormat.RGBA_8888,
        pixbuf.width,
        pixbuf.height,
        pixbuf.rowstride
    );
    return content;
}

async function addCursor(content, plan) {
    if (!plan.cursor)
        return content;

    const stream = Gio.MemoryOutputStream.new_resizable();
    try {
        const pixbuf = await Shell.Screenshot.composite_to_stream(
            content.get_texture(),
            0,
            0,
            -1,
            -1,
            plan.textureScale,
            plan.cursor.texture,
            plan.cursor.x,
            plan.cursor.y,
            plan.cursor.scale,
            stream
        );
        return contentFromPixbuf(pixbuf);
    } finally {
        stream.close(null);
    }
}

export const AnnotationOutputActor = GObject.registerClass(
class AnnotationOutputActor extends St.DrawingArea {
    _init({strokes, selection}) {
        super._init({
            reactive: false,
            can_focus: false,
            x_expand: false,
            y_expand: false,
        });
        this._strokes = strokes;
        this._selection = selection;
        this.set_position(selection.x, selection.y);
        this.set_size(selection.width, selection.height);
    }

    captureContent() {
        const content = this.paint_to_content(null);
        if (!content?.get_texture?.())
            throw new Error('Clutter could not paint the annotation texture');
        return content;
    }

    vfunc_repaint() {
        const cr = this.get_context();
        cr.translate(-this._selection.x, -this._selection.y);
        renderAnnotations(cr, this._strokes);
        cr.$dispose();
    }
});

export async function createAnnotationOutput({
    content,
    selection,
    cursor = null,
}) {
    const texture = content?.get_texture?.();
    if (!texture)
        throw new Error('Annotation content has no texture');

    const plan = createOutputPlan({
        selection,
        textureWidth: texture.get_width(),
        textureHeight: texture.get_height(),
        cursor,
    });
    return Object.freeze({
        content: await addCursor(content, plan),
        x: plan.originX,
        y: plan.originY,
        scale: plan.overlayScale,
    });
}
