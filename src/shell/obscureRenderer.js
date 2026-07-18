// SPDX-License-Identifier: GPL-3.0-only

import Clutter from 'gi://Clutter';
import Cogl from 'gi://Cogl';

import {
    createObscureTexturePlan,
} from '../core/obscureTexturePlan.js';

function coglContext() {
    return global.stage.context.get_backend().get_cogl_context();
}

function pipelineFilter(filter) {
    return filter === 'nearest'
        ? Cogl.PipelineFilter.NEAREST
        : Cogl.PipelineFilter.LINEAR;
}

export function contentFromTexture(texture) {
    // The second argument is an optional source rectangle. GJS still requires
    // it to be passed explicitly even when the whole texture is used.
    return Clutter.TextureContent.new_from_texture(texture, null);
}

function sampleSource(sourceTexture, plan) {
    const context = coglContext();
    const texture = Cogl.Texture2D.new_with_size(
        context,
        plan.samplePixelWidth,
        plan.samplePixelHeight
    );
    const framebuffer = Cogl.Offscreen.new_with_texture(texture);
    const pipeline = Cogl.Pipeline.new(context);
    pipeline.set_layer_texture(0, sourceTexture);
    pipeline.set_layer_filters(
        0,
        Cogl.PipelineFilter.LINEAR,
        Cogl.PipelineFilter.LINEAR
    );

    const {s1, t1, s2, t2} = plan.sourceCoordinates;
    framebuffer.draw_textured_rectangle(
        pipeline,
        -1,
        1,
        1,
        -1,
        s1,
        t1,
        s2,
        t2
    );
    return texture;
}

export function createObscurePreview({
    sourceTexture,
    annotation,
    clip,
    sourceScale,
}) {
    const targetPixelWidth = Math.max(1, Math.round(clip.width * sourceScale));
    const targetPixelHeight = Math.max(1, Math.round(clip.height * sourceScale));
    const plan = createObscureTexturePlan({
        annotation,
        clip,
        sourceScale,
        sourcePixelWidth: sourceTexture.get_width(),
        sourcePixelHeight: sourceTexture.get_height(),
        targetOrigin: {x: clip.x, y: clip.y},
        targetScale: sourceScale,
        targetPixelWidth,
        targetPixelHeight,
    });
    if (!plan)
        return null;

    return Object.freeze({
        content: contentFromTexture(sampleSource(sourceTexture, plan)),
        logicalRect: plan.logicalRect,
        scalingFilter: plan.filter === 'nearest'
            ? Clutter.ScalingFilter.NEAREST
            : Clutter.ScalingFilter.LINEAR,
        samplePixelBytes: plan.samplePixelBytes,
    });
}

export function drawObscureRegion({
    framebuffer,
    sourceTexture,
    annotation,
    selection,
    sourceScale,
    outputPlan,
}) {
    const plan = createObscureTexturePlan({
        annotation,
        clip: selection,
        sourceScale,
        sourcePixelWidth: sourceTexture.get_width(),
        sourcePixelHeight: sourceTexture.get_height(),
        targetOrigin: {x: outputPlan.originX, y: outputPlan.originY},
        targetScale: outputPlan.textureScale,
        targetPixelWidth: outputPlan.pixelWidth,
        targetPixelHeight: outputPlan.pixelHeight,
    });
    if (!plan)
        return false;

    const pipeline = Cogl.Pipeline.new(coglContext());
    pipeline.set_layer_texture(0, sampleSource(sourceTexture, plan));
    const filter = pipelineFilter(plan.filter);
    pipeline.set_layer_filters(0, filter, filter);
    const {x1, y1, x2, y2} = plan.targetRectangle;
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
    return true;
}
