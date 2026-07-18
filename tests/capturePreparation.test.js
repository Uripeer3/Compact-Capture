// SPDX-License-Identifier: GPL-3.0-only

import assert from 'node:assert/strict';
import test from 'node:test';

import {AnnotationDocument} from '../src/core/annotationDocument.js';
import {CapturePreparation} from '../src/core/capturePreparation.js';
import {Tool} from '../src/core/toolDefinitions.js';

test('includes the visible draft by committing it before snapshotting', () => {
    const document = new AnnotationDocument();
    document.beginStroke({
        tool: Tool.FREEHAND,
        color: '#112233',
        width: 3,
        point: {x: 1, y: 2},
    });
    document.appendPoint({x: 3, y: 4});
    const preparation = new CapturePreparation();
    const lease = preparation.begin({
        finishDraft: () => document.commitStroke(),
        setInputEnabled: () => {},
        snapshot: () => document.snapshot(),
    });

    assert.equal(document.isDrawing, false);
    assert.equal(lease.annotations.length, 1);
    assert.deepEqual(lease.annotations[0].points, [
        {x: 1, y: 2},
        {x: 3, y: 4},
    ]);
    lease.release();
});

test('drops an incomplete one-point draft before snapshotting', () => {
    const document = new AnnotationDocument();
    document.beginStroke({
        tool: Tool.RECTANGLE,
        color: '#112233',
        width: 3,
        point: {x: 1, y: 2},
    });
    const preparation = new CapturePreparation();
    const lease = preparation.begin({
        finishDraft: () => document.commitStroke(),
        setInputEnabled: () => {},
        snapshot: () => document.snapshot(),
    });

    assert.equal(document.isDrawing, false);
    assert.deepEqual(lease.annotations, []);
    lease.release();
});

test('finalizes a draft before locking and freezing one snapshot', () => {
    const events = [];
    const preparation = new CapturePreparation();
    const lease = preparation.begin({
        finishDraft: () => events.push('finish'),
        setInputEnabled: enabled => events.push(`input:${enabled}`),
        snapshot: () => {
            events.push('snapshot');
            return [{points: [{x: 1, y: 2}, {x: 3, y: 4}]}];
        },
    });

    assert.deepEqual(events, ['finish', 'input:false', 'snapshot']);
    assert.equal(preparation.active, true);
    assert.equal(lease.annotations.length, 1);
    assert.equal(lease.release(), true);
    assert.equal(lease.release(), false);
    assert.deepEqual(events, [
        'finish',
        'input:false',
        'snapshot',
        'input:true',
    ]);
    assert.equal(preparation.active, false);
});

test('refuses a second preparation while the first lease is active', () => {
    const preparation = new CapturePreparation();
    const callbacks = {
        finishDraft: () => {},
        setInputEnabled: () => {},
        snapshot: () => [],
    };
    const lease = preparation.begin(callbacks);

    assert.equal(preparation.begin(callbacks), null);
    assert.equal(preparation.cancel(), true);
    assert.equal(preparation.cancel(), false);
    assert.equal(lease.release(), false);
});

test('restores input when snapshot preparation fails', () => {
    const states = [];
    const preparation = new CapturePreparation();

    assert.throws(() => preparation.begin({
        finishDraft: () => {},
        setInputEnabled: enabled => states.push(enabled),
        snapshot: () => {
            throw new Error('snapshot failed');
        },
    }), /snapshot failed/);
    assert.deepEqual(states, [false, true]);
    assert.equal(preparation.active, false);
});

test('validates capture preparation callbacks and snapshot shape', () => {
    const preparation = new CapturePreparation();
    const valid = {
        finishDraft: () => {},
        setInputEnabled: () => {},
        snapshot: () => [],
    };

    assert.throws(() => preparation.begin({...valid, finishDraft: null}));
    assert.throws(() => preparation.begin({...valid, snapshot: null}));
    assert.throws(() => preparation.begin({...valid, setInputEnabled: null}));
    assert.throws(() => preparation.begin({...valid, snapshot: () => ({})}));
    assert.equal(preparation.active, false);
});
