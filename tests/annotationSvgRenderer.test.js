// SPDX-License-Identifier: GPL-3.0-only

import assert from 'node:assert/strict';
import test from 'node:test';

import {renderAnnotationsToSvg} from '../src/core/annotationSvgRenderer.js';
import {Tool} from '../src/core/toolDefinitions.js';

const PLAN = Object.freeze({
    originX: 100,
    originY: 50,
    pixelWidth: 300,
    pixelHeight: 150,
    textureScale: 1.5,
});

function stroke(tool, points, options = {}) {
    return {
        tool,
        points,
        color: options.color ?? '#3584e4',
        width: options.width ?? 3,
    };
}

test('serializes every v0.1 tool into a selection-sized SVG', () => {
    const svg = renderAnnotationsToSvg([
        stroke(Tool.FREEHAND, [{x: 110, y: 60}, {x: 120, y: 70}]),
        stroke(Tool.RECTANGLE, [{x: 160, y: 100}, {x: 130, y: 80}]),
        stroke(Tool.ARROW, [{x: 180, y: 60}, {x: 200, y: 80}]),
        stroke(Tool.HIGHLIGHTER, [{x: 120, y: 120}, {x: 180, y: 120}], {
            color: '#f6d32d',
            width: 12,
        }),
    ], PLAN);

    assert.match(svg, /width="300" height="150"/);
    assert.match(svg, /viewBox="100 50 200 100"/);
    assert.match(svg, /stroke-linecap="round"/);
    assert.match(svg, /<rect x="130" y="80" width="30" height="20"/);
    assert.match(svg, /stroke-linejoin="round"/);
    assert.match(svg, /stroke="#f6d32d" stroke-width="12"[^>]*stroke-opacity="0.4"/);
});

test('keeps the requested texture scale when pixel dimensions were rounded', () => {
    const svg = renderAnnotationsToSvg([], {
        originX: 0,
        originY: 0,
        pixelWidth: 152,
        pixelHeight: 77,
        textureScale: 1.5,
    });

    assert.match(svg, /viewBox="0 0 101\.33333333333333 51\.333333333333336"/);
});

test('rejects values that could escape SVG attributes', () => {
    assert.throws(() => renderAnnotationsToSvg([
        stroke(Tool.FREEHAND, [{x: 0, y: 0}, {x: 1, y: 1}], {
            color: 'red" onload="bad',
        }),
    ], PLAN), /six-digit hex/);
    assert.throws(() => renderAnnotationsToSvg([
        stroke(Tool.FREEHAND, [{x: 0, y: 0}, {x: Infinity, y: 1}]),
    ], PLAN), /must be finite/);
});
