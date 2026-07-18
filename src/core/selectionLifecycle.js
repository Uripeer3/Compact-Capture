// SPDX-License-Identifier: GPL-3.0-only

export const ScreenshotMode = Object.freeze({
    SCREENSHOT: 'screenshot',
    RECORDING: 'recording',
});

export const CaptureType = Object.freeze({
    SELECTION: 'selection',
    SCREEN: 'screen',
    WINDOW: 'window',
});

export const AreaState = Object.freeze({
    INACTIVE: 'inactive',
    EMPTY: 'empty',
    DRAGGING: 'dragging',
    SELECTED: 'selected',
});

export const LifecycleEvent = Object.freeze({
    OPENED: 'opened',
    CLOSED: 'closed',
    MODE_CHANGED: 'mode-changed',
    CAPTURE_CHANGED: 'capture-changed',
    SELECTION_STARTED: 'selection-started',
    SELECTION_COMPLETED: 'selection-completed',
});

export const EmptySelectionEffect = Object.freeze({
    NONE: 'none',
    ENTER: 'enter',
    LEAVE_KEEP_GEOMETRY: 'leave-keep-geometry',
    LEAVE_RESET_GEOMETRY: 'leave-reset-geometry',
});

const MODES = new Set(Object.values(ScreenshotMode));
const CAPTURE_TYPES = new Set(Object.values(CaptureType));
const AREA_STATES = new Set(Object.values(AreaState));
const EVENT_TYPES = new Set(Object.values(LifecycleEvent));

function assertValue(values, value, name) {
    if (!values.has(value))
        throw new TypeError(`Unsupported ${name}: ${value}`);
}

function freezeState({open, mode, captureType, areaState}) {
    return Object.freeze({open, mode, captureType, areaState});
}

function validateState(state) {
    if (!state || typeof state.open !== 'boolean')
        throw new TypeError('Selection lifecycle state is invalid');
    assertValue(MODES, state.mode, 'screenshot mode');
    assertValue(CAPTURE_TYPES, state.captureType, 'capture type');
    assertValue(AREA_STATES, state.areaState, 'area state');
}

function sameState(first, second) {
    return first.open === second.open &&
        first.mode === second.mode &&
        first.captureType === second.captureType &&
        first.areaState === second.areaState;
}

export function createSelectionLifecycle() {
    return freezeState({
        open: false,
        mode: ScreenshotMode.SCREENSHOT,
        captureType: CaptureType.SELECTION,
        areaState: AreaState.INACTIVE,
    });
}

export function requiresEmptySelection(state) {
    validateState(state);
    return state.open &&
        state.mode === ScreenshotMode.SCREENSHOT &&
        state.captureType === CaptureType.SELECTION &&
        state.areaState === AreaState.EMPTY;
}

export function transitionSelectionLifecycle(state, event) {
    validateState(state);
    if (!event || !EVENT_TYPES.has(event.type))
        throw new TypeError(`Unsupported lifecycle event: ${event?.type}`);

    let next = state;
    switch (event.type) {
    case LifecycleEvent.OPENED:
        assertValue(MODES, event.mode, 'screenshot mode');
        assertValue(CAPTURE_TYPES, event.captureType, 'capture type');
        next = freezeState({
            open: true,
            mode: event.mode,
            captureType: event.captureType,
            areaState: event.captureType === CaptureType.SELECTION
                ? AreaState.EMPTY
                : AreaState.INACTIVE,
        });
        break;
    case LifecycleEvent.CLOSED:
        next = createSelectionLifecycle();
        break;
    case LifecycleEvent.MODE_CHANGED:
        assertValue(MODES, event.mode, 'screenshot mode');
        next = freezeState({...state, mode: event.mode});
        break;
    case LifecycleEvent.CAPTURE_CHANGED:
        assertValue(CAPTURE_TYPES, event.captureType, 'capture type');
        next = freezeState({
            ...state,
            captureType: event.captureType,
            areaState: event.captureType === CaptureType.SELECTION
                ? AreaState.EMPTY
                : AreaState.INACTIVE,
        });
        break;
    case LifecycleEvent.SELECTION_STARTED:
        if (state.open && state.captureType === CaptureType.SELECTION)
            next = freezeState({...state, areaState: AreaState.DRAGGING});
        break;
    case LifecycleEvent.SELECTION_COMPLETED:
        if (state.open && state.captureType === CaptureType.SELECTION)
            next = freezeState({...state, areaState: AreaState.SELECTED});
        break;
    }

    const changed = !sameState(state, next);
    let effect = EmptySelectionEffect.NONE;
    const hadEmptySelection = requiresEmptySelection(state);
    const needsEmptySelection = requiresEmptySelection(next);
    if (!hadEmptySelection && needsEmptySelection) {
        effect = EmptySelectionEffect.ENTER;
    } else if (hadEmptySelection && !needsEmptySelection) {
        const keepGeometry = event.type === LifecycleEvent.CLOSED ||
            event.type === LifecycleEvent.SELECTION_STARTED;
        effect = keepGeometry
            ? EmptySelectionEffect.LEAVE_KEEP_GEOMETRY
            : EmptySelectionEffect.LEAVE_RESET_GEOMETRY;
    }

    return Object.freeze({state: next, changed, effect});
}
