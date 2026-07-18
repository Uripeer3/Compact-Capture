// SPDX-License-Identifier: GPL-3.0-only

function finitePositive(value, name) {
    if (!Number.isFinite(value) || value <= 0)
        throw new RangeError(`${name} must be positive`);
    return value;
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

    const plan = {
        originX: x,
        originY: y,
        logicalWidth: width,
        logicalHeight: height,
        pixelWidth: Math.max(1, Math.round(width * scale)),
        pixelHeight: Math.max(1, Math.round(height * scale)),
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
