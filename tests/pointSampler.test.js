// SPDX-License-Identifier: GPL-3.0-only

import assert from 'node:assert/strict';
import test from 'node:test';

import {
    DEFAULT_SAMPLE_DISTANCE,
    MAX_STROKE_POINTS,
    shouldSamplePoint,
} from '../src/core/pointSampler.js';

test('drops pointer jitter below the logical-pixel threshold', () => {
    assert.equal(shouldSamplePoint({x: 0, y: 0}, {x: 1, y: 1}), false);
    assert.equal(
        shouldSamplePoint({x: 0, y: 0}, {x: DEFAULT_SAMPLE_DISTANCE, y: 0}),
        true
    );
});

test('publishes a finite point budget for each gesture', () => {
    assert.equal(Number.isInteger(MAX_STROKE_POINTS), true);
    assert.equal(MAX_STROKE_POINTS >= 1024, true);
});

test('rejects malformed sampling input', () => {
    assert.throws(() => shouldSamplePoint({x: 0, y: 0}, {x: NaN, y: 1}));
    assert.throws(() => shouldSamplePoint({x: 0, y: 0}, {x: 1, y: 1}, -1));
});
