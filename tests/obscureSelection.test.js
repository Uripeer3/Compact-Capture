// SPDX-License-Identifier: GPL-3.0-only

import assert from 'node:assert/strict';
import test from 'node:test';

import {
    hitTestObscureHandle,
    ObscureHandle,
    obscureHandles,
    resizeObscureFromHandle,
} from '../src/core/obscureSelection.js';

const annotation = {points: [{x: 10, y: 20}, {x: 30, y: 50}]};

test('places equal hit targets around every obscure corner', () => {
    assert.deepEqual(obscureHandles(annotation, 12), [
        {handle: ObscureHandle.TOP_LEFT, x: 4, y: 14, width: 12, height: 12},
        {handle: ObscureHandle.TOP_RIGHT, x: 24, y: 14, width: 12, height: 12},
        {handle: ObscureHandle.BOTTOM_LEFT, x: 4, y: 44, width: 12, height: 12},
        {handle: ObscureHandle.BOTTOM_RIGHT, x: 24, y: 44, width: 12, height: 12},
    ]);
});

test('hit tests handles and anchors the opposite corner while resizing', () => {
    assert.equal(
        hitTestObscureHandle(annotation, {x: 30, y: 20}),
        ObscureHandle.TOP_RIGHT
    );
    assert.equal(hitTestObscureHandle(annotation, {x: 20, y: 35}), null);
    assert.deepEqual(resizeObscureFromHandle(
        annotation,
        ObscureHandle.TOP_RIGHT,
        {x: 40, y: 15}
    ), {
        start: {x: 10, y: 50},
        end: {x: 40, y: 15},
    });
});

test('rejects malformed handle geometry', () => {
    assert.throws(() => obscureHandles(annotation, 0), RangeError);
    assert.throws(() => hitTestObscureHandle(
        annotation,
        {x: Number.NaN, y: 1}
    ), TypeError);
    assert.throws(() => resizeObscureFromHandle(
        annotation,
        'center',
        {x: 1, y: 2}
    ), TypeError);
});
