// SPDX-License-Identifier: GPL-3.0-only

import assert from 'node:assert/strict';
import test from 'node:test';

import {
    annotationBounds,
    boundsIntersect,
} from '../src/core/annotationBounds.js';
import {Tool} from '../src/core/toolDefinitions.js';

test('includes stroke width and antialiasing around ordinary annotations', () => {
    assert.deepEqual(annotationBounds({
        tool: Tool.RECTANGLE,
        color: '#ffffff',
        width: 4,
        points: [{x: 10, y: 20}, {x: 30, y: 50}],
    }), {
        x: 7,
        y: 17,
        width: 26,
        height: 36,
    });
});

test('includes both arrowhead arms in dirty bounds', () => {
    const bounds = annotationBounds({
        tool: Tool.ARROW,
        color: '#ffffff',
        width: 4,
        points: [{x: 0, y: 0}, {x: 20, y: 0}],
    });

    assert.ok(bounds.y < -8);
    assert.ok(bounds.y + bounds.height > 8);
    assert.ok(bounds.x <= -3);
    assert.ok(bounds.x + bounds.width >= 23);
});

test('includes the axis extent of diagonal square highlighter caps', () => {
    const width = 16;
    const bounds = annotationBounds({
        tool: Tool.HIGHLIGHTER,
        color: '#ffffff',
        width,
        points: [{x: 20, y: 20}, {x: 80, y: 80}],
    });
    const requiredMargin = width / Math.SQRT2;

    assert.ok(bounds.x <= 20 - requiredMargin);
    assert.ok(bounds.y <= 20 - requiredMargin);
    assert.ok(bounds.x + bounds.width >= 80 + requiredMargin);
    assert.ok(bounds.y + bounds.height >= 80 + requiredMargin);
});

test('detects only bounds with a non-empty intersection', () => {
    const first = {x: 0, y: 0, width: 10, height: 10};
    assert.equal(boundsIntersect(first, {
        x: 9,
        y: 9,
        width: 5,
        height: 5,
    }), true);
    assert.equal(boundsIntersect(first, {
        x: 10,
        y: 0,
        width: 5,
        height: 5,
    }), false);
});
