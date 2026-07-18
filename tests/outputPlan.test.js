// SPDX-License-Identifier: GPL-3.0-only

import assert from 'node:assert/strict';
import test from 'node:test';

import {createOutputPlan} from '../src/core/outputPlan.js';

test('creates a selection-sized output texture at screenshot scale', () => {
    assert.deepEqual(createOutputPlan({
        selection: {x: 100, y: 50, width: 640, height: 360},
        textureWidth: 1280,
        textureHeight: 720,
    }), {
        originX: 100,
        originY: 50,
        logicalWidth: 640,
        logicalHeight: 360,
        pixelWidth: 1280,
        pixelHeight: 720,
        textureScale: 2,
        overlayScale: 0.5,
        cursor: null,
    });
});

test('places the native pointer relative to the selected output', () => {
    const texture = {};
    const plan = createOutputPlan({
        selection: {x: 1920, y: 100, width: 1280, height: 720},
        textureWidth: 1920,
        textureHeight: 1080,
        cursor: {texture, x: 2000, y: 140, scale: 0.5},
    });

    assert.deepEqual(plan.cursor, {
        texture,
        x: 120,
        y: 60,
        scale: 0.5,
    });
    assert.equal(plan.pixelWidth, 1920);
    assert.equal(plan.pixelHeight, 1080);
});

test('rejects malformed geometry and scales', () => {
    assert.throws(() => createOutputPlan({
        selection: {x: 0, y: 0, width: 0, height: 100},
        textureWidth: 100,
        textureHeight: 100,
    }));
    assert.throws(() => createOutputPlan({
        selection: {x: 0, y: 0, width: 100, height: 100},
        textureWidth: 0,
        textureHeight: 100,
    }));
});

test('rejects a painted texture with a non-uniform resource scale', () => {
    assert.throws(() => createOutputPlan({
        selection: {x: 0, y: 0, width: 100, height: 100},
        textureWidth: 200,
        textureHeight: 100,
    }), /uniform resource scale/);
});
