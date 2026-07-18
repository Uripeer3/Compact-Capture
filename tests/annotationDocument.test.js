// SPDX-License-Identifier: GPL-3.0-only

import assert from 'node:assert/strict';
import test from 'node:test';

import {AnnotationDocument} from '../src/core/annotationDocument.js';
import {Tool} from '../src/core/toolDefinitions.js';

const validStroke = {
    tool: Tool.FREEHAND,
    color: '#AABBCC',
    width: 3,
    point: {x: 1, y: 2},
};

test('commits a complete stroke as an isolated snapshot', () => {
    const document = new AnnotationDocument();
    document.beginStroke(validStroke);
    document.appendPoint({x: 4, y: 5});

    assert.equal(document.commitStroke(), true);
    assert.equal(document.hasAnnotations, true);
    assert.equal(document.size, 1);

    const snapshot = document.snapshot();
    snapshot[0].points[0].x = 99;
    assert.equal(document.snapshot()[0].points[0].x, 1);
    assert.equal(document.snapshot()[0].color, '#aabbcc');
});

test('does not commit a one-point gesture', () => {
    const document = new AnnotationDocument();
    document.beginStroke(validStroke);

    assert.equal(document.commitStroke(), false);
    assert.equal(document.size, 0);
});

test('ignores consecutive duplicate points', () => {
    const document = new AnnotationDocument();
    document.beginStroke(validStroke);
    document.appendPoint({x: 1, y: 2});
    document.appendPoint({x: 2, y: 3});
    document.commitStroke();

    assert.equal(document.snapshot()[0].points.length, 2);
});

test('replaces the live endpoint for shape tools', () => {
    const document = new AnnotationDocument();
    document.beginStroke({...validStroke, tool: Tool.RECTANGLE});
    document.replaceEndPoint({x: 5, y: 6});
    document.replaceEndPoint({x: 7, y: 8});

    assert.deepEqual(document.snapshot({includeDraft: true})[0].points, [
        {x: 1, y: 2},
        {x: 7, y: 8},
    ]);
});

test('undo, clear and cancel have deterministic state', () => {
    const document = new AnnotationDocument();
    document.beginStroke(validStroke);
    document.appendPoint({x: 2, y: 3});
    document.commitStroke();
    assert.equal(document.undo(), true);
    assert.equal(document.undo(), false);

    document.beginStroke(validStroke);
    document.cancelStroke();
    assert.equal(document.isDrawing, false);

    document.beginStroke(validStroke);
    document.appendPoint({x: 2, y: 3});
    document.commitStroke();
    document.clear();
    assert.deepEqual(document.snapshot(), []);
});

test('rejects invalid tool, style and coordinate input', () => {
    const document = new AnnotationDocument();

    assert.throws(() => document.beginStroke({...validStroke, tool: 'text'}));
    assert.throws(() => document.beginStroke({...validStroke, color: 'red'}));
    assert.throws(() => document.beginStroke({...validStroke, width: 0}));
    assert.throws(() => document.beginStroke({...validStroke, point: {x: NaN, y: 1}}));
});
