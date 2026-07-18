// SPDX-License-Identifier: GPL-3.0-only

import assert from 'node:assert/strict';
import test from 'node:test';

import {
    AreaState,
    CaptureType,
    createSelectionLifecycle,
    EmptySelectionEffect,
    LifecycleEvent,
    requiresEmptySelection,
    ScreenshotMode,
    transitionSelectionLifecycle,
} from '../src/core/selectionLifecycle.js';

function transition(state, type, properties = {}) {
    return transitionSelectionLifecycle(state, {type, ...properties});
}

test('opens screenshot area mode in an explicit empty state', () => {
    const result = transition(
        createSelectionLifecycle(),
        LifecycleEvent.OPENED,
        {
            mode: ScreenshotMode.SCREENSHOT,
            captureType: CaptureType.SELECTION,
        }
    );

    assert.equal(result.state.areaState, AreaState.EMPTY);
    assert.equal(result.effect, EmptySelectionEffect.ENTER);
    assert.equal(requiresEmptySelection(result.state), true);
});

test('reconciles an initial recording session when returning to screenshot mode', () => {
    let result = transition(
        createSelectionLifecycle(),
        LifecycleEvent.OPENED,
        {
            mode: ScreenshotMode.RECORDING,
            captureType: CaptureType.SELECTION,
        }
    );
    assert.equal(result.state.areaState, AreaState.EMPTY);
    assert.equal(result.effect, EmptySelectionEffect.NONE);

    result = transition(result.state, LifecycleEvent.MODE_CHANGED, {
        mode: ScreenshotMode.SCREENSHOT,
    });
    assert.equal(result.effect, EmptySelectionEffect.ENTER);
    assert.equal(requiresEmptySelection(result.state), true);
});

test('restores an empty area across temporary recording mode', () => {
    let state = transition(createSelectionLifecycle(), LifecycleEvent.OPENED, {
        mode: ScreenshotMode.SCREENSHOT,
        captureType: CaptureType.SELECTION,
    }).state;

    let result = transition(state, LifecycleEvent.MODE_CHANGED, {
        mode: ScreenshotMode.RECORDING,
    });
    assert.equal(result.effect, EmptySelectionEffect.LEAVE_RESET_GEOMETRY);
    state = result.state;

    result = transition(state, LifecycleEvent.MODE_CHANGED, {
        mode: ScreenshotMode.SCREENSHOT,
    });
    assert.equal(result.effect, EmptySelectionEffect.ENTER);
});

test('preserves a user-selected recording region on return to screenshots', () => {
    let state = transition(createSelectionLifecycle(), LifecycleEvent.OPENED, {
        mode: ScreenshotMode.RECORDING,
        captureType: CaptureType.SELECTION,
    }).state;
    state = transition(
        state,
        LifecycleEvent.SELECTION_STARTED
    ).state;
    state = transition(
        state,
        LifecycleEvent.SELECTION_COMPLETED
    ).state;

    const result = transition(state, LifecycleEvent.MODE_CHANGED, {
        mode: ScreenshotMode.SCREENSHOT,
    });
    assert.equal(result.state.areaState, AreaState.SELECTED);
    assert.equal(result.effect, EmptySelectionEffect.NONE);
});

test('capture type changes reset selection state deterministically', () => {
    let state = transition(createSelectionLifecycle(), LifecycleEvent.OPENED, {
        mode: ScreenshotMode.SCREENSHOT,
        captureType: CaptureType.SELECTION,
    }).state;

    let result = transition(state, LifecycleEvent.CAPTURE_CHANGED, {
        captureType: CaptureType.SCREEN,
    });
    assert.equal(result.state.areaState, AreaState.INACTIVE);
    assert.equal(result.effect, EmptySelectionEffect.LEAVE_RESET_GEOMETRY);
    state = result.state;

    result = transition(state, LifecycleEvent.CAPTURE_CHANGED, {
        captureType: CaptureType.SELECTION,
    });
    assert.equal(result.state.areaState, AreaState.EMPTY);
    assert.equal(result.effect, EmptySelectionEffect.ENTER);
});

test('native selection drag owns geometry until completion', () => {
    let state = transition(createSelectionLifecycle(), LifecycleEvent.OPENED, {
        mode: ScreenshotMode.SCREENSHOT,
        captureType: CaptureType.SELECTION,
    }).state;

    let result = transition(state, LifecycleEvent.SELECTION_STARTED);
    assert.equal(result.state.areaState, AreaState.DRAGGING);
    assert.equal(result.effect, EmptySelectionEffect.LEAVE_KEEP_GEOMETRY);
    state = result.state;

    result = transition(state, LifecycleEvent.SELECTION_COMPLETED);
    assert.equal(result.state.areaState, AreaState.SELECTED);
    assert.equal(result.effect, EmptySelectionEffect.NONE);
});

test('close leaves native geometry untouched and resets the model', () => {
    const state = transition(createSelectionLifecycle(), LifecycleEvent.OPENED, {
        mode: ScreenshotMode.SCREENSHOT,
        captureType: CaptureType.SELECTION,
    }).state;
    const result = transition(state, LifecycleEvent.CLOSED);

    assert.equal(result.state.open, false);
    assert.equal(result.state.areaState, AreaState.INACTIVE);
    assert.equal(result.effect, EmptySelectionEffect.LEAVE_KEEP_GEOMETRY);
});

test('repeated native signals are idempotent', () => {
    const state = transition(createSelectionLifecycle(), LifecycleEvent.OPENED, {
        mode: ScreenshotMode.SCREENSHOT,
        captureType: CaptureType.SCREEN,
    }).state;
    const result = transition(state, LifecycleEvent.CAPTURE_CHANGED, {
        captureType: CaptureType.SCREEN,
    });

    assert.equal(result.changed, false);
    assert.equal(result.effect, EmptySelectionEffect.NONE);
});

test('rejects malformed lifecycle state and events', () => {
    assert.throws(() => requiresEmptySelection({}), TypeError);
    assert.throws(() => transitionSelectionLifecycle(
        createSelectionLifecycle(),
        {type: 'unknown'}
    ), TypeError);
    assert.throws(() => transition(
        createSelectionLifecycle(),
        LifecycleEvent.OPENED,
        {mode: 'camera', captureType: CaptureType.SELECTION}
    ), TypeError);
});
