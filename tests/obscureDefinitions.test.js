// SPDX-License-Identifier: GPL-3.0-only

import assert from 'node:assert/strict';
import test from 'node:test';

import {
    DEFAULT_OBSCURE_INTENSITY,
    DEFAULT_OBSCURE_TREATMENT,
    MAX_OBSCURE_LOGICAL_AREA,
    obscureArea,
    obscureRect,
    ObscureTreatment,
    validateObscureIntensity,
    validateObscureTreatment,
} from '../src/core/obscureDefinitions.js';

const reverseRectangle = {
    points: [{x: 30, y: 50}, {x: 10, y: 20}],
};

test('publishes bounded pixelate defaults', () => {
    assert.equal(DEFAULT_OBSCURE_TREATMENT, ObscureTreatment.PIXELATE);
    assert.equal(DEFAULT_OBSCURE_INTENSITY, 10);
    assert.equal(MAX_OBSCURE_LOGICAL_AREA, 8_388_608);
});

test('normalizes obscure rectangles and computes logical area', () => {
    assert.deepEqual(obscureRect(reverseRectangle), {
        x: 10,
        y: 20,
        width: 20,
        height: 30,
    });
    assert.equal(obscureArea(reverseRectangle), 600);
    assert.equal(obscureArea({points: [{x: 1, y: 2}]}), 0);
});

test('validates treatment, intensity and finite geometry', () => {
    assert.equal(
        validateObscureTreatment(ObscureTreatment.BLUR),
        ObscureTreatment.BLUR
    );
    assert.equal(validateObscureIntensity(4), 4);
    assert.equal(validateObscureIntensity(24), 24);
    assert.throws(() => validateObscureTreatment('redact'), TypeError);
    assert.throws(() => validateObscureIntensity(3), RangeError);
    assert.throws(() => validateObscureIntensity(Number.NaN), RangeError);
    assert.throws(() => obscureRect({
        points: [{x: 1, y: 2}, {x: Infinity, y: 3}],
    }), TypeError);
});
