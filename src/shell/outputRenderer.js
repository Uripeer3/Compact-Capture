// SPDX-License-Identifier: GPL-3.0-only

import Cairo from 'gi://cairo';
import Cogl from 'gi://Cogl';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Shell from 'gi://Shell';
import St from 'gi://St';

import {renderAnnotations} from '../core/annotationRenderer.js';
import {createOutputPlan} from '../core/outputPlan.js';

const LITTLE_ENDIAN = new Uint8Array(
    new Uint32Array([0x01020304]).buffer
)[0] === 0x04;
const CAIRO_ARGB32_PIXEL_FORMAT = LITTLE_ENDIAN
    ? Cogl.PixelFormat.BGRA_8888_PRE
    : Cogl.PixelFormat.ARGB_8888_PRE;

function coglContext() {
    return global.stage.context.get_backend().get_cogl_context();
}

function contentFromSurface(surface, width, height) {
    surface.flush();
    const bytes = GLib.Bytes.new(surface.getData());
    const content = St.ImageContent.new_with_preferred_size(width, height);
    content.set_bytes(
        coglContext(),
        bytes,
        CAIRO_ARGB32_PIXEL_FORMAT,
        width,
        height,
        surface.getStride()
    );
    return content;
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
            plan.outputScale,
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
    const plan = createOutputPlan({selection, outputScale, cursor});
    const surface = new Cairo.ImageSurface(
        Cairo.Format.ARGB32,
        plan.pixelWidth,
        plan.pixelHeight
    );
    const cr = new Cairo.Context(surface);

    try {
        cr.scale(plan.outputScale, plan.outputScale);
        cr.translate(-plan.originX, -plan.originY);
        renderAnnotations(cr, strokes);
    } finally {
        cr.$dispose();
    }

    try {
        const content = contentFromSurface(
            surface,
            plan.pixelWidth,
            plan.pixelHeight
        );
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
