// SPDX-License-Identifier: GPL-3.0-only

import {intersectRects, normalizeRect} from './geometry.js';
import {
    obscureRect,
    ObscureTreatment,
    validateObscureIntensity,
    validateObscureTreatment,
} from './obscureDefinitions.js';

function positive(value, name) {
    if (!Number.isFinite(value) || value <= 0)
        throw new RangeError(`${name} must be positive`);
    return value;
}

function pixelBounds(rect, origin, scale) {
    const left = Math.floor((rect.x - origin.x) * scale);
    const top = Math.floor((rect.y - origin.y) * scale);
    const right = Math.ceil((rect.x + rect.width - origin.x) * scale);
    const bottom = Math.ceil((rect.y + rect.height - origin.y) * scale);
    return Object.freeze({
        x: left,
        y: top,
        width: right - left,
        height: bottom - top,
    });
}

function clampPixelRect(rect, width, height) {
    const clamp = (value, maximum) => Math.min(Math.max(value, 0), maximum);
    const left = clamp(rect.x, width);
    const top = clamp(rect.y, height);
    const right = clamp(rect.x + rect.width, width);
    const bottom = clamp(rect.y + rect.height, height);
    if (right <= left || bottom <= top)
        return null;
    return Object.freeze({
        x: left,
        y: top,
        width: right - left,
        height: bottom - top,
    });
}

function clipRectangle(rect, width, height) {
    return Object.freeze({
        x1: -1 + 2 * rect.x / width,
        y1: 1 - 2 * rect.y / height,
        x2: -1 + 2 * (rect.x + rect.width) / width,
        y2: 1 - 2 * (rect.y + rect.height) / height,
    });
}

export function createObscureTexturePlan({
    annotation,
    clip,
    sourceScale,
    sourcePixelWidth,
    sourcePixelHeight,
    targetOrigin,
    targetScale,
    targetPixelWidth,
    targetPixelHeight,
}) {
    const treatment = validateObscureTreatment(
        annotation?.obscureTreatment
    );
    const intensity = validateObscureIntensity(
        annotation?.obscureIntensity
    );
    const clipped = intersectRects(obscureRect(annotation), clip);
    if (!clipped)
        return null;

    const sourceWidth = positive(sourcePixelWidth, 'Source pixel width');
    const sourceHeight = positive(sourcePixelHeight, 'Source pixel height');
    const sourceResourceScale = positive(sourceScale, 'Source scale');
    const targetResourceScale = positive(targetScale, 'Target scale');
    const targetWidth = positive(targetPixelWidth, 'Target pixel width');
    const targetHeight = positive(targetPixelHeight, 'Target pixel height');
    const origin = normalizeRect({...targetOrigin, width: 0, height: 0});

    const sourcePixels = clampPixelRect(
        pixelBounds(clipped, {x: 0, y: 0}, sourceResourceScale),
        sourceWidth,
        sourceHeight
    );
    const targetPixels = clampPixelRect(
        pixelBounds(clipped, origin, targetResourceScale),
        targetWidth,
        targetHeight
    );
    if (!sourcePixels || !targetPixels)
        return null;

    const blockPixels = Math.max(1, Math.round(
        intensity * sourceResourceScale
    ));
    const samplePixelWidth = Math.max(
        1,
        Math.ceil(sourcePixels.width / blockPixels)
    );
    const samplePixelHeight = Math.max(
        1,
        Math.ceil(sourcePixels.height / blockPixels)
    );

    return Object.freeze({
        treatment,
        filter: treatment === ObscureTreatment.PIXELATE
            ? 'nearest'
            : 'linear',
        logicalRect: clipped,
        sourcePixels,
        sourceCoordinates: Object.freeze({
            s1: sourcePixels.x / sourceWidth,
            t1: sourcePixels.y / sourceHeight,
            s2: (sourcePixels.x + sourcePixels.width) / sourceWidth,
            t2: (sourcePixels.y + sourcePixels.height) / sourceHeight,
        }),
        targetPixels,
        targetRectangle: clipRectangle(
            targetPixels,
            targetWidth,
            targetHeight
        ),
        samplePixelWidth,
        samplePixelHeight,
        blockPixels,
        samplePixelBytes: samplePixelWidth * samplePixelHeight * 4,
    });
}
