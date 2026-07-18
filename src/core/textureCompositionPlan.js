// SPDX-License-Identifier: GPL-3.0-only

function clipSpaceRectangle(rectangle, pixelWidth, pixelHeight) {
    return Object.freeze({
        x1: -1 + 2 * rectangle.x / pixelWidth,
        y1: 1 - 2 * rectangle.y / pixelHeight,
        x2: -1 + 2 * (rectangle.x + rectangle.width) / pixelWidth,
        y2: 1 - 2 * (rectangle.y + rectangle.height) / pixelHeight,
    });
}

export function createTextureCompositionPlan(outputPlan, baseTexture) {
    const base = Object.freeze({
        texture: baseTexture,
        rectangle: Object.freeze({x1: -1, y1: 1, x2: 1, y2: -1}),
    });
    const cursor = outputPlan.cursor
        ? Object.freeze({
            texture: outputPlan.cursor.texture,
            rectangle: clipSpaceRectangle(
                outputPlan.cursor,
                outputPlan.pixelWidth,
                outputPlan.pixelHeight
            ),
        })
        : null;

    return Object.freeze({
        base,
        cursor,
        layers: Object.freeze(cursor ? [base, cursor] : [base]),
        pixelBytes: outputPlan.pixelWidth * outputPlan.pixelHeight * 4,
    });
}
