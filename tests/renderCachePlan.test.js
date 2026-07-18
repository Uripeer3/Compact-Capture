// SPDX-License-Identifier: GPL-3.0-only

import assert from 'node:assert/strict';
import test from 'node:test';

import {CommittedChangeType} from '../src/core/annotationDocument.js';
import {
    alignRectToDevicePixels,
    CacheUpdate,
    renderCacheUpdate,
} from '../src/core/renderCachePlan.js';

const base = {
    cachedRevision: 4,
    cachedScale: 2,
    hasSurface: true,
    nextRevision: 5,
    nextScale: 2,
    hasCommitted: true,
};

test('updates one sequential committed revision incrementally', () => {
    assert.equal(renderCacheUpdate({
        ...base,
        change: {type: CommittedChangeType.APPEND},
    }), CacheUpdate.APPEND);
    assert.equal(renderCacheUpdate({
        ...base,
        change: {type: CommittedChangeType.REMOVE},
    }), CacheUpdate.DIRTY);
    assert.equal(renderCacheUpdate({
        ...base,
        hasCommitted: false,
        change: {type: CommittedChangeType.CLEAR},
    }), CacheUpdate.CLEAR);
});

test('allocates only for first content or a resource-scale change', () => {
    assert.equal(renderCacheUpdate({
        ...base,
        hasSurface: false,
        cachedRevision: -1,
        nextRevision: 0,
        change: null,
    }), CacheUpdate.ALLOCATE);
    assert.equal(renderCacheUpdate({
        ...base,
        nextScale: 1,
        change: {type: CommittedChangeType.APPEND},
    }), CacheUpdate.ALLOCATE);
});

test('uses an existing-surface full redraw after a revision gap', () => {
    assert.equal(renderCacheUpdate({
        ...base,
        nextRevision: 7,
        change: {type: CommittedChangeType.APPEND},
    }), CacheUpdate.FULL);
});

test('does no cache work when committed content is unchanged or empty', () => {
    assert.equal(renderCacheUpdate({
        ...base,
        nextRevision: 4,
        change: null,
    }), CacheUpdate.NONE);
    assert.equal(renderCacheUpdate({
        ...base,
        hasSurface: false,
        hasCommitted: false,
        change: null,
    }), CacheUpdate.NONE);
});

test('expands fractional dirty bounds to cache device pixels', () => {
    assert.deepEqual(alignRectToDevicePixels({
        x: 387.5,
        y: 57.5,
        width: 25,
        height: 45,
    }, 1, {x: 300, y: 40}), {
        x: 387,
        y: 57,
        width: 26,
        height: 46,
    });

    assert.deepEqual(alignRectToDevicePixels({
        x: 387.75,
        y: 57.75,
        width: 25,
        height: 45,
    }, 2, {x: 300, y: 40}), {
        x: 387.5,
        y: 57.5,
        width: 25.5,
        height: 45.5,
    });
});

test('rejects malformed device-pixel alignment input', () => {
    assert.throws(() => alignRectToDevicePixels({
        x: 0,
        y: 0,
        width: 10,
        height: 10,
    }, 0), RangeError);
    assert.throws(() => alignRectToDevicePixels({
        x: 0,
        y: 0,
        width: -1,
        height: 10,
    }, 1), RangeError);
});
