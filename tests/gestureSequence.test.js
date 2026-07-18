// SPDX-License-Identifier: GPL-3.0-only

import assert from 'node:assert/strict';
import test from 'node:test';

import {GestureSequence} from '../src/core/gestureSequence.js';

test('owns only the pointer button that began a gesture', () => {
    const gesture = new GestureSequence();

    assert.equal(gesture.beginPointer(1), true);
    assert.equal(gesture.isPointer, true);
    assert.equal(gesture.ownsPointer(1), true);
    assert.equal(gesture.ownsPointer(2), false);
    assert.equal(gesture.ownsTouch({}), false);
    assert.equal(gesture.beginPointer(1), false);
    assert.equal(gesture.clear(), true);
    assert.equal(gesture.active, false);
});

test('owns only the touch sequence that began a gesture', () => {
    const gesture = new GestureSequence();
    const firstFinger = 7;
    const secondFinger = 12;

    assert.equal(gesture.beginTouch(firstFinger), true);
    assert.equal(gesture.ownsTouch(firstFinger), true);
    assert.equal(gesture.ownsTouch(secondFinger), false);
    assert.equal(gesture.beginTouch(secondFinger), false);
    gesture.clear();
    assert.equal(gesture.beginTouch(secondFinger), true);
    assert.equal(gesture.ownsTouch(secondFinger), true);
});

test('rejects invalid pointer buttons and missing touch sequences', () => {
    const gesture = new GestureSequence();

    assert.throws(() => gesture.beginPointer(0), TypeError);
    assert.throws(() => gesture.beginPointer(1.5), TypeError);
    assert.throws(() => gesture.beginTouch(null), TypeError);
    assert.throws(() => gesture.beginTouch(undefined), TypeError);
});
