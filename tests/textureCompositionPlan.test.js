// SPDX-License-Identifier: GPL-3.0-only

import assert from 'node:assert/strict';
import test from 'node:test';

import {
    createTextureCompositionPlan,
} from '../src/core/textureCompositionPlan.js';

test('uses the uploaded annotation texture directly without a pointer', () => {
    const baseTexture = {};
    const plan = createTextureCompositionPlan({
        pixelWidth: 3840,
        pixelHeight: 2160,
        cursor: null,
    }, baseTexture);

    assert.equal(plan.base.texture, baseTexture);
    assert.deepEqual(plan.base.rectangle, {
        x1: -1,
        y1: 1,
        x2: 1,
        y2: -1,
    });
    assert.equal(plan.cursor, null);
    assert.deepEqual(plan.layers, [plan.base]);
    assert.equal(plan.pixelBytes, 33_177_600);
});

test('places and clips the pointer in framebuffer clip space', () => {
    const baseTexture = {};
    const texture = {};
    const plan = createTextureCompositionPlan({
        pixelWidth: 200,
        pixelHeight: 100,
        cursor: {texture, x: -10, y: 25, width: 40, height: 20},
    }, baseTexture);

    assert.equal(plan.cursor.texture, texture);
    assert.deepEqual(plan.layers, [plan.base, plan.cursor]);
    assert.deepEqual(plan.cursor.rectangle, {
        x1: -1.1,
        y1: 0.5,
        x2: -0.7,
        y2: 0.09999999999999998,
    });
});

test('can compose a native pointer without an annotation base layer', () => {
    const cursorTexture = {};
    const plan = {
        pixelWidth: 100,
        pixelHeight: 50,
        cursor: {
            texture: cursorTexture,
            x: 10,
            y: 10,
            width: 20,
            height: 20,
        },
    };
    const composition = createTextureCompositionPlan(plan, null);

    assert.equal(composition.base, null);
    assert.equal(composition.layers.length, 1);
    assert.strictEqual(composition.layers[0].texture, cursorTexture);
});
