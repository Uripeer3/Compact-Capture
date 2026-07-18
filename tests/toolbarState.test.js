// SPDX-License-Identifier: GPL-3.0-only

import assert from 'node:assert/strict';
import test from 'node:test';

import {
    DEFAULT_OBSCURE_INTENSITY,
    ObscureTreatment,
} from '../src/core/obscureDefinitions.js';
import {Tool} from '../src/core/toolDefinitions.js';
import {ToolbarState} from '../src/core/toolbarState.js';

test('provides stable defaults for a new screenshot session', () => {
    const state = new ToolbarState();

    assert.deepEqual(state.snapshot(), {
        tool: Tool.FREEHAND,
        color: '#ed333b',
        lineWidth: 3,
        obscureTreatment: ObscureTreatment.PIXELATE,
        obscureIntensity: DEFAULT_OBSCURE_INTENSITY,
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
        obscureTreatment: ObscureTreatment.PIXELATE,
        obscureIntensity: DEFAULT_OBSCURE_INTENSITY,
    });
});

test('keeps obscure treatment and intensity independently of drawing style', () => {
    const state = new ToolbarState();
    state.selectTool(Tool.OBSCURE);
    state.setObscureTreatment(ObscureTreatment.BLUR);
    state.setObscureIntensity(18);

    assert.deepEqual(state.snapshot(), {
        tool: Tool.OBSCURE,
        color: '#ed333b',
        lineWidth: 3,
        obscureTreatment: ObscureTreatment.BLUR,
        obscureIntensity: 18,
    });
});

test('uses and restores each tool default width', () => {
    const state = new ToolbarState();

    state.selectTool(Tool.HIGHLIGHTER);
    assert.equal(state.lineWidth, 12);

    state.selectTool(Tool.RECTANGLE);
    assert.equal(state.lineWidth, 3);

    state.selectTool(Tool.HIGHLIGHTER);
    assert.equal(state.lineWidth, 12);
});

test('remembers customized widths independently for each tool', () => {
    const state = new ToolbarState();
    state.setLineWidth(5);

    state.selectTool(Tool.HIGHLIGHTER);
    state.setLineWidth(14);

    state.selectTool(Tool.FREEHAND);
    assert.equal(state.lineWidth, 5);

    state.selectTool(Tool.HIGHLIGHTER);
    assert.equal(state.lineWidth, 14);
});

test('allows an explicit initial width to override the tool default', () => {
    const state = new ToolbarState({
        tool: Tool.HIGHLIGHTER,
        lineWidth: 10,
    });

    assert.equal(state.lineWidth, 10);
});

test('rejects unsupported toolbar values', () => {
    const state = new ToolbarState();

    assert.throws(() => state.selectTool('text'), TypeError);
    assert.throws(() => state.selectColor('#123456'), TypeError);
    assert.throws(() => state.setLineWidth(0), RangeError);
    assert.throws(() => state.setLineWidth(17), RangeError);
    assert.throws(() => state.setLineWidth(Number.NaN), RangeError);
    assert.throws(() => state.setObscureTreatment('redact'), TypeError);
    assert.throws(() => state.setObscureIntensity(3), RangeError);
    assert.throws(() => state.setObscureIntensity(25), RangeError);
});
