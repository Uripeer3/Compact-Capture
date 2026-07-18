// SPDX-License-Identifier: GPL-3.0-only

import assert from 'node:assert/strict';
import test from 'node:test';

import {
    EmptySelectionController,
} from '../src/shell/emptySelectionController.js';

function fixture() {
    const calls = [];
    const actors = [{opacity: 255}, {opacity: 180}];
    const areaIndicator = {
        setSelectionRect(...geometry) {
            calls.push(['indicator', ...geometry]);
        },
    };
    const selector = {
        _areaIndicator: areaIndicator,
        _startX: 10,
        _startY: 20,
        _lastX: 110,
        _lastY: 220,
        getGeometry: () => [10, 20, 100, 200],
        _updateSelectionRect() {
            calls.push(['update']);
        },
        set_cursor_type(cursor) {
            calls.push(['cursor', cursor]);
        },
        reset() {
            calls.push(['reset']);
        },
    };
    const captureButton = {reactive: true};
    const errors = [];
    const controller = new EmptySelectionController({
        onError: (message, error) => errors.push([message, error.message]),
    });
    const enter = () => controller.enter({
        selector,
        visualActors: actors,
        captureButton,
        cursorType: 'crosshair',
        emptyCoordinate: -1_000_000,
    });

    return {
        actors,
        calls,
        captureButton,
        controller,
        enter,
        errors,
        selector,
    };
}

test('commits and reverses the empty-area actor effect', () => {
    const state = fixture();

    assert.equal(state.enter(), true);
    assert.equal(state.controller.active, true);
    assert.deepEqual(state.actors.map(actor => actor.opacity), [0, 0]);
    assert.equal(state.captureButton.reactive, false);
    assert.equal(state.selector._startX, -1_000_000);

    assert.equal(state.controller.leave({resetGeometry: true}), true);
    assert.equal(state.controller.active, false);
    assert.deepEqual(state.actors.map(actor => actor.opacity), [255, 180]);
    assert.equal(state.captureButton.reactive, true);
    assert.ok(state.calls.some(call => call[0] === 'reset'));
});

test('rolls back partial entry before reporting failure', () => {
    const state = fixture();
    let updates = 0;
    state.selector._updateSelectionRect = () => {
        updates++;
        if (updates === 1)
            throw new Error('injected entry failure');
    };

    assert.equal(state.enter(), false);
    assert.equal(state.controller.active, false);
    assert.equal(state.selector._startX, 10);
    assert.deepEqual(state.actors.map(actor => actor.opacity), [255, 180]);
    assert.equal(state.captureButton.reactive, true);
    assert.ok(state.errors.some(([, message]) =>
        message === 'injected entry failure'));
});

test('restores other actors even when native reset fails', () => {
    const state = fixture();
    assert.equal(state.enter(), true);
    state.selector.reset = () => {
        throw new Error('injected reset failure');
    };

    assert.equal(state.controller.leave({resetGeometry: true}), false);
    assert.equal(state.controller.active, false);
    assert.equal(state.selector._startX, 10);
    assert.deepEqual(state.actors.map(actor => actor.opacity), [255, 180]);
    assert.equal(state.captureButton.reactive, true);
    assert.ok(state.errors.some(([, message]) =>
        message === 'injected reset failure'));
});
