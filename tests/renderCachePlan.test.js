// SPDX-License-Identifier: GPL-3.0-only

import assert from 'node:assert/strict';
import test from 'node:test';

import {CommittedChangeType} from '../src/core/annotationDocument.js';
import {
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
