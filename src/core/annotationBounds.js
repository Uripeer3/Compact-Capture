// SPDX-License-Identifier: GPL-3.0-only

import {Tool} from './toolDefinitions.js';
import {obscureRect} from './obscureDefinitions.js';

const cachedBounds = new WeakMap();

function extendPointExtents(extents, points) {
    let {minimumX, minimumY, maximumX, maximumY} = extents;
    for (const point of points) {
        minimumX = Math.min(minimumX, point.x);
        minimumY = Math.min(minimumY, point.y);
        maximumX = Math.max(maximumX, point.x);
        maximumY = Math.max(maximumY, point.y);
    }
    return {minimumX, minimumY, maximumX, maximumY};
}

function emptyPointExtents() {
    return {
        minimumX: Infinity,
        minimumY: Infinity,
        maximumX: -Infinity,
        maximumY: -Infinity,
    };
}

export function arrowHeadPoints(stroke) {
    if (stroke.tool !== Tool.ARROW || stroke.points.length < 2)
        return [];

    const start = stroke.points.at(0);
    const end = stroke.points.at(-1);
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const spread = Math.PI / 7;
    const headLength = stroke.width * 5;

    return [
        {
            x: end.x - headLength * Math.cos(angle - spread),
            y: end.y - headLength * Math.sin(angle - spread),
        },
        {
            x: end.x - headLength * Math.cos(angle + spread),
            y: end.y - headLength * Math.sin(angle + spread),
        },
    ];
}

export function annotationBounds(stroke) {
    if (!stroke || !Number.isFinite(stroke.width) || stroke.width <= 0 ||
        !stroke.points || stroke.points.length === 0) {
        throw new TypeError('Annotation geometry is invalid');
    }

    const cacheable = Object.isFrozen(stroke) &&
        Object.isFrozen(stroke.points);
    const cached = cacheable ? cachedBounds.get(stroke) : null;
    if (cached)
        return cached;

    if (stroke.tool === Tool.OBSCURE) {
        const bounds = obscureRect(stroke);
        if (cacheable)
            cachedBounds.set(stroke, bounds);
        return bounds;
    }

    let extents = extendPointExtents(emptyPointExtents(), stroke.points);
    extents = extendPointExtents(extents, arrowHeadPoints(stroke));
    // Include half the stroke width and one logical pixel for antialiasing.
    const margin = stroke.width / 2 + 1;

    const bounds = Object.freeze({
        x: extents.minimumX - margin,
        y: extents.minimumY - margin,
        width: extents.maximumX - extents.minimumX + margin * 2,
        height: extents.maximumY - extents.minimumY + margin * 2,
    });
    if (cacheable)
        cachedBounds.set(stroke, bounds);
    return bounds;
}

export function boundsIntersect(first, second) {
    return first.x < second.x + second.width &&
        first.x + first.width > second.x &&
        first.y < second.y + second.height &&
        first.y + first.height > second.y;
}
