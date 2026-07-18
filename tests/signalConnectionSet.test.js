// SPDX-License-Identifier: GPL-3.0-only

import assert from 'node:assert/strict';
import test from 'node:test';

import {SignalConnectionSet} from '../src/core/signalConnectionSet.js';

class MockSignalTarget {
    #callbacks = new Map();
    #nextId = 1;

    connect(_signal, callback) {
        const id = this.#nextId++;
        this.#callbacks.set(id, callback);
        return id;
    }

    disconnect(id) {
        if (!this.#callbacks.delete(id))
            throw new Error(`Unknown signal ${id}`);
    }

    emit() {
        for (const callback of this.#callbacks.values())
            callback(this);
    }

    get connectionCount() {
        return this.#callbacks.size;
    }
}

test('replaces stale actor connections with the current session targets', () => {
    const oldTargets = [new MockSignalTarget(), new MockSignalTarget()];
    const newTarget = new MockSignalTarget();
    const seen = [];
    const connections = new SignalConnectionSet();

    connections.replace(
        oldTargets,
        'notify::checked',
        target => seen.push(target)
    );
    oldTargets[0].emit();
    assert.deepEqual(seen, [oldTargets[0]]);

    connections.replace(
        [newTarget],
        'notify::checked',
        target => seen.push(target)
    );
    assert.equal(oldTargets[0].connectionCount, 0);
    assert.equal(oldTargets[1].connectionCount, 0);
    oldTargets[0].emit();
    newTarget.emit();
    assert.deepEqual(seen, [oldTargets[0], newTarget]);
    assert.equal(connections.size, 1);

    connections.clear();
    assert.equal(newTarget.connectionCount, 0);
    assert.equal(connections.size, 0);
});

test('rolls back a partially connected replacement', () => {
    const validTarget = new MockSignalTarget();
    const invalidTarget = {};
    const connections = new SignalConnectionSet();

    assert.throws(() => connections.replace(
        [validTarget, invalidTarget],
        'notify::checked',
        () => {}
    ), TypeError);
    assert.equal(validTarget.connectionCount, 0);
    assert.equal(connections.size, 0);
});

test('validates replacement arguments', () => {
    const connections = new SignalConnectionSet();
    assert.throws(() => connections.replace({}, 'signal', () => {}));
    assert.throws(() => connections.replace([], '', () => {}));
    assert.throws(() => connections.replace([], 'signal', null));
});
