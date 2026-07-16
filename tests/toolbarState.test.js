// SPDX-License-Identifier: GPL-3.0-only

import assert from 'node:assert/strict';
import test from 'node:test';

import {Tool} from '../src/toolDefinitions.js';
import {ToolbarState} from '../src/toolbarState.js';

test('provides stable defaults for a new screenshot session', () => {
    const state = new ToolbarState();

    assert.deepEqual(state.snapshot(), {
        tool: Tool.FREEHAND,
        color: '#ed333b',
        lineWidth: 3,
    });
});

test('keeps valid tool style changes together', () => {
    const state = new ToolbarState();
    state.selectTool(Tool.HIGHLIGHTER);
    state.selectColor('#f6d32d');
    state.setLineWidth(12.5);

    assert.deepEqual(state.snapshot(), {
        tool: Tool.HIGHLIGHTER,
        color: '#f6d32d',
        lineWidth: 12.5,
    });
});

test('rejects unsupported toolbar values', () => {
    const state = new ToolbarState();

    assert.throws(() => state.selectTool('text'), TypeError);
    assert.throws(() => state.selectColor('#123456'), TypeError);
    assert.throws(() => state.setLineWidth(0), RangeError);
    assert.throws(() => state.setLineWidth(17), RangeError);
    assert.throws(() => state.setLineWidth(Number.NaN), RangeError);
});
