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
    textureWidth,
    textureHeight,
    cursor = null,
}) {
    const x = finiteCoordinate(selection?.x, 'Selection x');
    const y = finiteCoordinate(selection?.y, 'Selection y');
    const width = finitePositive(selection?.width, 'Selection width');
    const height = finitePositive(selection?.height, 'Selection height');
    const pixelWidth = finitePositive(textureWidth, 'Texture width');
    const pixelHeight = finitePositive(textureHeight, 'Texture height');
    const horizontalScale = pixelWidth / width;
    const verticalScale = pixelHeight / height;

    if (Math.abs(horizontalScale - verticalScale) > 0.01) {
        throw new RangeError(
            'Output texture must use one uniform resource scale'
        );
    }

    const scale = (horizontalScale + verticalScale) / 2;

    const plan = {
        originX: x,
        originY: y,
        logicalWidth: width,
        logicalHeight: height,
        pixelWidth,
        pixelHeight,
        textureScale: scale,
        overlayScale: 1 / scale,
        cursor: null,
    };

    if (cursor?.texture) {
        plan.cursor = Object.freeze({
            texture: cursor.texture,
            x: Math.round(
                (finiteCoordinate(cursor.x, 'Cursor x') - x) * scale
            ),
            y: Math.round(
                (finiteCoordinate(cursor.y, 'Cursor y') - y) * scale
            ),
            scale: finitePositive(cursor.scale, 'Cursor scale'),
        });
    }

    return Object.freeze(plan);
}
