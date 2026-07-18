// SPDX-License-Identifier: GPL-3.0-only

import assert from 'node:assert/strict';
import test from 'node:test';

import {
    drawingRects,
    intersectRects,
    monitorForRect,
    monitorPointToStage,
    placeToolbar,
    stagePointToMonitor,
    stagePointToOutput,
} from '../src/core/geometry.js';

const monitors = [
    {index: 0, x: 0, y: 0, width: 1920, height: 1080},
    {index: 1, x: 1920, y: 0, width: 2560, height: 1440},
];

test('intersects a selection with each monitor in stage coordinates', () => {
    assert.deepEqual(
        intersectRects({x: 1800, y: 100, width: 300, height: 200}, monitors[1]),
        {x: 1920, y: 100, width: 180, height: 200}
    );
    assert.equal(
        intersectRects({x: 10, y: 10, width: 20, height: 20}, monitors[1]),
        null
    );
});

test('chooses the monitor containing the largest part of a selection', () => {
    assert.equal(
        monitorForRect(monitors, {x: 1800, y: 100, width: 600, height: 500}).index,
        1
    );
});

test('keeps a native resize gutter around each drawing surface', () => {
    assert.deepEqual(
        drawingRects({x: 1800, y: 100, width: 300, height: 200}, monitors, 8),
        [
            {monitorIndex: 0, x: 1808, y: 108, width: 112, height: 184},
            {monitorIndex: 1, x: 1920, y: 108, width: 172, height: 184},
        ]
    );
});

test('converts stage, monitor and output coordinate spaces explicitly', () => {
    const stagePoint = {x: 2020, y: 75};
    assert.deepEqual(stagePointToMonitor(stagePoint, monitors[1]), {x: 100, y: 75});
    assert.deepEqual(monitorPointToStage({x: 100, y: 75}, monitors[1]), stagePoint);
    assert.deepEqual(stagePointToOutput(stagePoint, monitors[1], 2), {x: 200, y: 150});
});

test('places the toolbar above, below, then at the monitor top', () => {
    const toolbar = {width: 500, height: 48};
    assert.deepEqual(
        placeToolbar({
            selection: {x: 300, y: 300, width: 600, height: 300},
            monitor: monitors[0],
            toolbar,
        }),
        {monitorIndex: 0, x: 350, y: 244}
    );
    assert.equal(
        placeToolbar({
            selection: {x: 300, y: 20, width: 600, height: 300},
            monitor: monitors[0],
            toolbar,
        }).y,
        328
    );
    assert.equal(
        placeToolbar({
            selection: {x: 300, y: 20, width: 600, height: 1040},
            monitor: monitors[0],
            toolbar,
        }).y,
        12
    );
});

test('balances an oversized toolbar across a narrow monitor', () => {
    assert.deepEqual(
        placeToolbar({
            selection: {x: 100, y: 100, width: 200, height: 200},
            monitor: {index: 2, x: 0, y: 0, width: 480, height: 800},
            toolbar: {width: 560, height: 48},
        }),
        {monitorIndex: 2, x: -40, y: 44}
    );
});

test('keeps a tall toolbar balanced inside a short monitor', () => {
    assert.equal(
        placeToolbar({
            selection: {x: 0, y: 0, width: 320, height: 180},
            monitor: {index: 3, x: 0, y: 0, width: 320, height: 180},
            toolbar: {width: 280, height: 200},
        }).y,
        -10
    );
});
