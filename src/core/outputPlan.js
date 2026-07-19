// SPDX-License-Identifier: GPL-3.0-only

const RGBA_BYTES_PER_PIXEL = 4;
const BASE_OUTPUT_SURFACES = 2;
const CURSOR_OUTPUT_SURFACES = 3;

// GdkPixbuf owns one RGBA raster while St uploads a second copy. Pointer
// composition adds one selection-sized Cogl texture. A 128 MiB ceiling admits
// 4K output with the pointer (about 95 MiB) while refusing larger work before
// any selection-sized surface is allocated inside GNOME Shell.
export const MAX_ANNOTATION_OUTPUT_BYTES = 128 * 1024 * 1024;

function finitePositive(value, name) {
    if (!Number.isFinite(value) || value <= 0)
        throw new RangeError(`${name} must be positive`);
    return value;
}

function pixelDimension(logicalSize, scale, name) {
    const pixels = Math.max(1, Math.round(logicalSize * scale));
    if (!Number.isSafeInteger(pixels))
        throw new RangeError(`${name} is too large`);
    return pixels;
}

function finiteCoordinate(value, name) {
    if (!Number.isFinite(value))
        throw new TypeError(`${name} must be finite`);
    return value;
}

export function createOutputPlan({
    selection,
    outputScale,
    cursor = null,
}) {
    const scale = finitePositive(outputScale, 'Output scale');
    const x = finiteCoordinate(selection?.x, 'Selection x');
    const y = finiteCoordinate(selection?.y, 'Selection y');
    const width = finitePositive(selection?.width, 'Selection width');
    const height = finitePositive(selection?.height, 'Selection height');
    const pixelWidth = pixelDimension(width, scale, 'Output width');
    const pixelHeight = pixelDimension(height, scale, 'Output height');
    const pixelCount = pixelWidth * pixelHeight;
    const surfaceCount = cursor?.texture
        ? CURSOR_OUTPUT_SURFACES
        : BASE_OUTPUT_SURFACES;
    const estimatedTransientBytes = pixelCount *
        RGBA_BYTES_PER_PIXEL * surfaceCount;
    if (!Number.isSafeInteger(pixelCount) ||
        !Number.isSafeInteger(estimatedTransientBytes) ||
        estimatedTransientBytes > MAX_ANNOTATION_OUTPUT_BYTES) {
        throw new RangeError(
            'Annotation output exceeds the 128 MiB transient allocation limit'
        );
    }

    const plan = {
        originX: x,
        originY: y,
        logicalWidth: width,
        logicalHeight: height,
        pixelWidth,
        pixelHeight,
        estimatedTransientBytes,
        textureScale: scale,
        overlayScale: 1 / scale,
        cursor: null,
    };

    if (cursor?.texture) {
        const cursorScale = finitePositive(cursor.scale, 'Cursor scale');
        const cursorWidth = finitePositive(cursor.width, 'Cursor width');
        const cursorHeight = finitePositive(cursor.height, 'Cursor height');
        plan.cursor = Object.freeze({
            texture: cursor.texture,
            x: Math.round(
                (finiteCoordinate(cursor.x, 'Cursor x') - x) * scale
            ),
            y: Math.round(
                (finiteCoordinate(cursor.y, 'Cursor y') - y) * scale
            ),
            // Cogl accepts subpixel rectangle edges. Keep the exact native
            // cursor scale instead of introducing a second rounding step.
            width: cursorWidth * cursorScale * scale,
            height: cursorHeight * cursorScale * scale,
        });
    }

    return Object.freeze(plan);
}
