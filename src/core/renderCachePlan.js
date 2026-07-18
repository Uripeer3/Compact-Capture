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
        return CacheUpdate.DIRTY;
    case CommittedChangeType.CLEAR:
        return CacheUpdate.CLEAR;
    default:
        return CacheUpdate.FULL;
    }
}
