// SPDX-License-Identifier: GPL-3.0-only

import assert from 'node:assert/strict';
import test from 'node:test';

import {
    AnnotationDocument,
    MAX_DOCUMENT_POINTS,
    MAX_DOCUMENT_STROKES,
} from '../src/core/annotationDocument.js';
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
    assert.equal(document.canUndo, true);
    assert.equal(document.canRedo, false);
    assert.equal(document.undo(), true);
    assert.equal(document.canRedo, true);
    assert.equal(document.redo(), true);
    assert.equal(document.size, 1);
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
    assert.equal(document.canUndo, false);
    assert.equal(document.canRedo, false);
});

test('a new committed stroke invalidates redo history', () => {
    const document = new AnnotationDocument();
    document.beginStroke(validStroke);
    document.appendPoint({x: 2, y: 3});
    document.commitStroke();
    document.undo();

    document.beginStroke({...validStroke, point: {x: 10, y: 20}});
    document.appendPoint({x: 30, y: 40});
    document.commitStroke();

    assert.equal(document.canRedo, false);
    assert.equal(document.redo(), false);
    assert.equal(document.size, 1);
    assert.deepEqual(document.snapshot()[0].points[0], {x: 10, y: 20});
});

test('undo cancels a draft before changing committed history', () => {
    const document = new AnnotationDocument();
    document.beginStroke(validStroke);

    assert.equal(document.canUndo, true);
    assert.equal(document.undo(), true);
    assert.equal(document.isDrawing, false);
    assert.equal(document.size, 0);
    assert.equal(document.canRedo, false);
});

test('rejects invalid tool, style and coordinate input', () => {
    const document = new AnnotationDocument();

    assert.throws(() => document.beginStroke({...validStroke, tool: 'text'}));
    assert.throws(() => document.beginStroke({...validStroke, color: 'red'}));
    assert.throws(() => document.beginStroke({...validStroke, width: 0}));
    assert.throws(() => document.beginStroke({...validStroke, point: {x: NaN, y: 1}}));
});

test('shares a revisioned read-only render view without deep copies', () => {
    const document = new AnnotationDocument();
    const emptyView = document.renderView();
    assert.strictEqual(document.renderView(), emptyView);
    assert.ok(Object.isFrozen(emptyView));
    assert.ok(Object.isFrozen(emptyView.committed));

    document.beginStroke(validStroke);
    const firstDraftView = document.renderView();
    const firstPointSequence = firstDraftView.draft.points;
    assert.equal(firstPointSequence.length, 1);
    assert.equal(firstPointSequence.push, undefined);
    assert.ok(Object.isFrozen(firstDraftView.draft));

    document.appendPoint({x: 4, y: 5});
    const updatedDraftView = document.renderView();
    assert.notStrictEqual(updatedDraftView, firstDraftView);
    assert.strictEqual(updatedDraftView.draft.points, firstPointSequence);
    assert.deepEqual([...updatedDraftView.draft.points], [
        {x: 1, y: 2},
        {x: 4, y: 5},
    ]);

    document.commitStroke();
    const committedView = document.renderView();
    assert.equal(committedView.draft, null);
    assert.equal(committedView.committed.length, 1);
    assert.ok(Object.isFrozen(committedView.committed.at(0)));
    assert.ok(Object.isFrozen(committedView.committed.at(0).points));
});

test('reuses one render view across multiple overlay consumers', () => {
    const document = new AnnotationDocument();
    document.beginStroke(validStroke);
    document.appendPoint({x: 2, y: 3});
    document.commitStroke();

    const firstOverlayView = document.renderView();
    const secondOverlayView = document.renderView();

    assert.strictEqual(firstOverlayView, secondOverlayView);
    assert.strictEqual(
        firstOverlayView.committed,
        secondOverlayView.committed
    );
});

test('bounds committed, redo and draft points while allowing divergent edits', () => {
    const document = new AnnotationDocument({maxPoints: 4, maxStrokes: 2});

    assert.equal(document.beginStroke(validStroke), true);
    assert.equal(document.appendPoint({x: 2, y: 3}), true);
    assert.equal(document.commitStroke(), true);

    assert.equal(document.beginStroke({
        ...validStroke,
        point: {x: 10, y: 20},
    }), true);
    assert.equal(document.appendPoint({x: 30, y: 40}), true);
    assert.equal(document.canAppendPoint, false);
    assert.equal(document.appendPoint({x: 50, y: 60}), false);
    assert.equal(document.replaceEndPoint({x: 50, y: 60}), true);
    assert.equal(document.commitStroke(), true);
    assert.equal(document.pointCount, 4);

    assert.equal(document.beginStroke(validStroke), false);
    assert.equal(document.undo(), true);
    assert.equal(document.pointCount, 4);
    assert.equal(document.beginStroke(validStroke), true);
    assert.equal(document.pointCount, 3);
    assert.equal(document.appendPoint({x: 5, y: 6}), true);
    assert.equal(document.commitStroke(), true);
    assert.equal(document.pointCount, 4);
    assert.equal(document.canRedo, false);

    document.clear();
    assert.equal(document.pointCount, 0);
    assert.equal(document.beginStroke(validStroke), true);
});

test('keeps prior committed render sequences stable across history changes', () => {
    const document = new AnnotationDocument();
    document.beginStroke(validStroke);
    document.appendPoint({x: 2, y: 3});
    document.commitStroke();
    const firstSequence = document.renderView().committed;

    document.beginStroke({...validStroke, point: {x: 10, y: 20}});
    document.appendPoint({x: 30, y: 40});
    document.commitStroke();
    const secondSequence = document.renderView().committed;

    assert.deepEqual([...firstSequence].map(stroke => stroke.points[0]), [
        {x: 1, y: 2},
    ]);
    assert.equal(secondSequence.length, 2);

    document.undo();
    assert.strictEqual(document.renderView().committed.at(0), firstSequence.at(0));
    assert.equal(document.renderView().committed.length, 1);
});

test('releases invalidated redo points after a new commit', () => {
    const document = new AnnotationDocument({maxPoints: 4});
    document.beginStroke(validStroke);
    document.appendPoint({x: 2, y: 3});
    document.commitStroke();
    document.undo();
    assert.equal(document.pointCount, 2);

    document.beginStroke({...validStroke, point: {x: 10, y: 20}});
    document.appendPoint({x: 30, y: 40});
    document.commitStroke();

    assert.equal(document.pointCount, 2);
    assert.equal(document.canRedo, false);
});

test('publishes finite production document limits', () => {
    assert.equal(MAX_DOCUMENT_POINTS, 65_536);
    assert.equal(MAX_DOCUMENT_STROKES, 1_024);
    assert.throws(() => new AnnotationDocument({maxPoints: 1}), RangeError);
    assert.throws(() => new AnnotationDocument({maxStrokes: 0}), RangeError);
});
