// SPDX-License-Identifier: GPL-3.0-only

import assert from 'node:assert/strict';
import test from 'node:test';

import {
    createOutputPlan,
    MAX_ANNOTATION_OUTPUT_BYTES,
} from '../src/core/outputPlan.js';

test('creates a selection-sized output texture at screenshot scale', () => {
    assert.deepEqual(createOutputPlan({
        selection: {x: 100, y: 50, width: 640, height: 360},
        outputScale: 2,
    }), {
        originX: 100,
        originY: 50,
        logicalWidth: 640,
        logicalHeight: 360,
        pixelWidth: 1280,
        pixelHeight: 720,
        estimatedTransientBytes: 1280 * 720 * 4 * 2,
        textureScale: 2,
        overlayScale: 0.5,
        cursor: null,
    });
});

test('places the native pointer relative to the selected output', () => {
    const texture = {};
    const plan = createOutputPlan({
        selection: {x: 1920, y: 100, width: 1280, height: 720},
        outputScale: 1.5,
        cursor: {
            texture,
            x: 2000,
            y: 140,
            width: 48,
            height: 64,
            scale: 0.5,
        },
    });

    assert.deepEqual(plan.cursor, {
        texture,
        x: 120,
        y: 60,
        width: 36,
        height: 48,
    });
    assert.equal(plan.pixelWidth, 1920);
    assert.equal(plan.pixelHeight, 1080);
    assert.equal(plan.estimatedTransientBytes, 1920 * 1080 * 4 * 3);
});

test('keeps an off-selection pointer rectangle for framebuffer clipping', () => {
    const texture = {};
    const plan = createOutputPlan({
        selection: {x: 100, y: 100, width: 400, height: 300},
        outputScale: 2,
        cursor: {
            texture,
            x: 90,
            y: 80,
            width: 24,
            height: 24,
            scale: 1,
        },
    });

    assert.deepEqual(plan.cursor, {
        texture,
        x: -20,
        y: -40,
        width: 48,
        height: 48,
    });
});

test('preserves fractional native pointer scaling', () => {
    const plan = createOutputPlan({
        selection: {x: 0, y: 0, width: 100, height: 100},
        outputScale: 1.25,
        cursor: {
            texture: {},
            x: 10,
            y: 10,
            width: 25,
            height: 25,
            scale: 0.75,
        },
    });

    assert.equal(plan.cursor.width, 23.4375);
    assert.equal(plan.cursor.height, 23.4375);
});

test('rounds fractional-scale output dimensions to complete pixels', () => {
    const plan = createOutputPlan({
        selection: {x: 0, y: 0, width: 101, height: 51},
        outputScale: 1.5,
    });

    assert.equal(plan.pixelWidth, 152);
    assert.equal(plan.pixelHeight, 77);
});

test('admits 4K pointer output within the allocation budget', () => {
    const plan = createOutputPlan({
        selection: {x: 0, y: 0, width: 3840, height: 2160},
        outputScale: 1,
        cursor: {
            texture: {},
            x: 0,
            y: 0,
            width: 24,
            height: 24,
            scale: 1,
        },
    });

    assert.equal(plan.estimatedTransientBytes, 3840 * 2160 * 4 * 3);
    assert.ok(plan.estimatedTransientBytes < MAX_ANNOTATION_OUTPUT_BYTES);
});

test('rejects oversized output before allocating a surface', () => {
    assert.throws(() => createOutputPlan({
        selection: {x: 0, y: 0, width: 5120, height: 2880},
        outputScale: 1,
        cursor: {
            texture: {},
            x: 0,
            y: 0,
            width: 24,
            height: 24,
            scale: 1,
        },
    }), /128 MiB/);
    assert.throws(() => createOutputPlan({
        selection: {x: 0, y: 0, width: Number.MAX_VALUE, height: 100},
        outputScale: 2,
    }), /too large/);
});

test('rejects malformed geometry and scales', () => {
    assert.throws(() => createOutputPlan({
        selection: {x: 0, y: 0, width: 0, height: 100},
        outputScale: 1,
    }));
    assert.throws(() => createOutputPlan({
        selection: {x: 0, y: 0, width: 100, height: 100},
        outputScale: 0,
    }));
    assert.throws(() => createOutputPlan({
        selection: {x: 0, y: 0, width: 100, height: 100},
        outputScale: 1,
        cursor: {
            texture: {},
            x: 0,
            y: 0,
            width: 0,
            height: 24,
            scale: 1,
        },
    }));
});
