// SPDX-License-Identifier: GPL-3.0-only

import Cairo from 'gi://cairo';
import Cogl from 'gi://Cogl';
import Gio from 'gi://Gio';
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

export async function createAnnotationOutput({
    strokes,
    selection,
    outputScale,
    cursor = null,
}) {
    const plan = createOutputPlan({
        selection,
        outputScale,
        cursor,
    });
    const surface = new Cairo.ImageSurface(
        Cairo.Format.ARGB32,
        plan.pixelWidth,
        plan.pixelHeight
    );
    const cr = new Cairo.Context(surface);

    try {
        cr.scale(plan.textureScale, plan.textureScale);
        cr.translate(-plan.originX, -plan.originY);
        renderAnnotations(cr, strokes);
    } finally {
        cr.$dispose();
    }

    try {
        surface.flush();
        // paint_to_content() belongs to Meta.WindowActor and Clutter.Stage,
        // not St.DrawingArea. GDK exposes Cairo's supported pixel conversion.
        const pixbuf = imports.gi.Gdk.pixbuf_get_from_surface(
            surface,
            0,
            0,
            plan.pixelWidth,
            plan.pixelHeight
        );
        if (!pixbuf)
            throw new Error('GDK could not convert the annotation surface');

        const content = contentFromPixbuf(pixbuf);
        return Object.freeze({
            content: await addCursor(content, plan),
            x: plan.originX,
            y: plan.originY,
            scale: plan.overlayScale,
        });
    } finally {
        surface.finish();
    }
}
