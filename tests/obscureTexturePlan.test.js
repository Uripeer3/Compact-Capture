// SPDX-License-Identifier: GPL-3.0-only

import assert from 'node:assert/strict';
import test from 'node:test';

import {
    createObscureTexturePlan,
} from '../src/core/obscureTexturePlan.js';
import {ObscureTreatment} from '../src/core/obscureDefinitions.js';

function input(overrides = {}) {
    return {
        annotation: {
            points: [{x: 110.25, y: 60.25}, {x: 210.25, y: 110.25}],
            obscureTreatment: ObscureTreatment.PIXELATE,
            obscureIntensity: 10,
        },
        clip: {x: 100, y: 50, width: 400, height: 200},
        sourceScale: 2,
        sourcePixelWidth: 3840,
        sourcePixelHeight: 2160,
        targetOrigin: {x: 100, y: 50},
        targetScale: 2,
        targetPixelWidth: 800,
        targetPixelHeight: 400,
        ...overrides,
    };
}

test('maps a stage rectangle to bounded source samples and output pixels', () => {
    const plan = createObscureTexturePlan(input());

    assert.deepEqual(plan.sourcePixels, {
        x: 220,
        y: 120,
        width: 201,
        height: 101,
    });
    assert.deepEqual(plan.targetPixels, {
        x: 20,
        y: 20,
        width: 201,
        height: 101,
    });
    assert.equal(plan.blockPixels, 20);
    assert.equal(plan.samplePixelWidth, 11);
    assert.equal(plan.samplePixelHeight, 6);
    assert.equal(plan.samplePixelBytes, 264);
    assert.equal(plan.filter, 'nearest');
    assert.deepEqual(plan.targetRectangle, {
        x1: -0.95,
        y1: 0.9,
        x2: -0.4475,
        y2: 0.395,
    });
});

test('keeps maximum-area sampling near two MiB at HiDPI', () => {
    const plan = createObscureTexturePlan(input({
        annotation: {
            points: [{x: 0, y: 0}, {x: 4096, y: 2048}],
            obscureTreatment: ObscureTreatment.PIXELATE,
            obscureIntensity: 4,
        },
        clip: {x: 0, y: 0, width: 4096, height: 2048},
        sourcePixelWidth: 8192,
        sourcePixelHeight: 4096,
        targetOrigin: {x: 0, y: 0},
        targetPixelWidth: 8192,
        targetPixelHeight: 4096,
    }));

    assert.equal(plan.samplePixelWidth, 1024);
    assert.equal(plan.samplePixelHeight, 512);
    assert.equal(plan.samplePixelBytes, 2_097_152);
});

test('clips regions before allocating samples', () => {
    const plan = createObscureTexturePlan(input({
        annotation: {
            points: [{x: 50, y: 40}, {x: 150, y: 90}],
            obscureTreatment: ObscureTreatment.BLUR,
            obscureIntensity: 20,
        },
    }));

    assert.deepEqual(plan.logicalRect, {
        x: 100,
        y: 50,
        width: 50,
        height: 40,
    });
    assert.equal(plan.filter, 'linear');
    assert.equal(plan.samplePixelWidth, 3);
    assert.equal(plan.samplePixelHeight, 2);
});

test('returns null outside the capture and validates malformed input', () => {
    assert.equal(createObscureTexturePlan(input({
        annotation: {
            points: [{x: 0, y: 0}, {x: 10, y: 10}],
            obscureTreatment: ObscureTreatment.PIXELATE,
            obscureIntensity: 10,
        },
    })), null);

    assert.throws(() => createObscureTexturePlan(input({sourceScale: 0})), RangeError);
    assert.throws(() => createObscureTexturePlan(input({
        annotation: {
            ...input().annotation,
            obscureTreatment: 'redact',
        },
    })), TypeError);
});
