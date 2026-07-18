// SPDX-License-Identifier: GPL-3.0-only

import {CommittedChangeType} from './annotationDocument.js';

export const CacheUpdate = Object.freeze({
    NONE: 'none',
    ALLOCATE: 'allocate',
    APPEND: 'append',
    DIRTY: 'dirty',
    CLEAR: 'clear',
    FULL: 'full',
});

export function alignRectToDevicePixels(rect, scale, origin = {x: 0, y: 0}) {
    if (!Number.isFinite(scale) || scale <= 0)
        throw new RangeError('Resource scale must be positive');
    for (const [name, value] of Object.entries({
        x: rect?.x,
        y: rect?.y,
        width: rect?.width,
        height: rect?.height,
        originX: origin?.x,
        originY: origin?.y,
    })) {
        if (!Number.isFinite(value))
            throw new TypeError(`${name} must be finite`);
    }
    if (rect.width < 0 || rect.height < 0)
        throw new RangeError('Rectangle dimensions cannot be negative');

    const left = origin.x +
        Math.floor((rect.x - origin.x) * scale) / scale;
    const top = origin.y +
        Math.floor((rect.y - origin.y) * scale) / scale;
    const right = origin.x +
        Math.ceil((rect.x + rect.width - origin.x) * scale) / scale;
    const bottom = origin.y +
        Math.ceil((rect.y + rect.height - origin.y) * scale) / scale;

    return Object.freeze({
        x: left,
        y: top,
        width: right - left,
        height: bottom - top,
    });
}

export function renderCacheUpdate({
    cachedRevision,
    cachedScale,
    hasSurface,
    nextRevision,
    nextScale,
    hasCommitted,
    change,
}) {
    if (hasSurface && nextScale !== cachedScale)
        return CacheUpdate.ALLOCATE;
    if (!hasSurface)
        return hasCommitted ? CacheUpdate.ALLOCATE : CacheUpdate.NONE;
    if (nextRevision === cachedRevision)
        return CacheUpdate.NONE;
    if (nextRevision !== cachedRevision + 1 || !change)
        return CacheUpdate.FULL;

    switch (change.type) {
    case CommittedChangeType.APPEND:
        return CacheUpdate.APPEND;
    case CommittedChangeType.REMOVE:
    case CommittedChangeType.REPLACE:
        return CacheUpdate.DIRTY;
    case CommittedChangeType.CLEAR:
        return CacheUpdate.CLEAR;
    default:
        return CacheUpdate.FULL;
    }
}
