// SPDX-License-Identifier: GPL-3.0-only

import Clutter from 'gi://Clutter';
import Cogl from 'gi://Cogl';
import GdkPixbuf from 'gi://GdkPixbuf';
import St from 'gi://St';

import {renderAnnotationsToSvg} from '../core/annotationSvgRenderer.js';
import {createOutputPlan} from '../core/outputPlan.js';
import {
    createTextureCompositionPlan,
} from '../core/textureCompositionPlan.js';

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

function annotationContent(strokes, plan) {
    const loader = GdkPixbuf.PixbufLoader.new_with_type('svg');
    const svg = renderAnnotationsToSvg(strokes, plan);

    loader.set_size(plan.pixelWidth, plan.pixelHeight);
    loader.write(new TextEncoder().encode(svg));
    loader.close();

    const pixbuf = loader.get_pixbuf();
    if (!pixbuf)
        throw new Error('GdkPixbuf could not rasterize annotation output');
    return contentFromPixbuf(pixbuf);
}

function addCursor(content, plan) {
    if (!plan.cursor)
        return content;

    const context = coglContext();
    const texture = Cogl.Texture2D.new_with_size(
        context,
        plan.pixelWidth,
        plan.pixelHeight
    );
    const framebuffer = Cogl.Offscreen.new_with_texture(texture);
    const composition = createTextureCompositionPlan(
        plan,
        content.get_texture()
    );

    framebuffer.clear4f(Cogl.BufferBit.COLOR, 0, 0, 0, 0);

    // GNOME uses this same offscreen-texture pattern when it freezes the
    // native cursor. Keeping composition on the GPU avoids a texture readback
    // and an intermediate PNG that would immediately be decoded again.
    for (const layer of composition.layers) {
        const pipeline = Cogl.Pipeline.new(context);
        pipeline.set_layer_texture(0, layer.texture);
        const {x1, y1, x2, y2} = layer.rectangle;
        framebuffer.draw_textured_rectangle(
            pipeline,
            x1,
            y1,
            x2,
            y2,
            0,
            0,
            1,
            1
        );
    }

    return Clutter.TextureContent.new_from_texture(texture);
}

export function createAnnotationOutput({
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
    const content = annotationContent(strokes, plan);
    return Object.freeze({
        content: addCursor(content, plan),
        x: plan.originX,
        y: plan.originY,
        scale: plan.overlayScale,
    });
}
