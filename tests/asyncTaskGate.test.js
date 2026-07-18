// SPDX-License-Identifier: GPL-3.0-only

import assert from 'node:assert/strict';
import test from 'node:test';

import {AsyncTaskGate} from '../src/core/asyncTaskGate.js';

test('shares one promise across concurrent capture requests', async () => {
    const gate = new AsyncTaskGate();
    let resolveTask;
    let calls = 0;
    const task = () => {
        calls++;
        return new Promise(resolve => {
            resolveTask = resolve;
        });
    };

    const first = gate.run(task);
    const second = gate.run(task);
    assert.strictEqual(second, first);
    assert.equal(gate.active, true);

    await Promise.resolve();
    assert.equal(calls, 1);
    resolveTask('saved');
    assert.equal(await first, 'saved');
    assert.equal(gate.active, false);
});

test('opens for a new request after success or failure', async () => {
    const gate = new AsyncTaskGate();

    await assert.rejects(gate.run(() => {
        throw new Error('save failed');
    }), /save failed/);
    assert.equal(gate.active, false);
    assert.equal(await gate.run(() => 'saved'), 'saved');
    assert.equal(gate.active, false);
});

test('validates the task before inspecting active state', async () => {
    const gate = new AsyncTaskGate();
    const active = gate.run(() => 'saved');

    assert.throws(() => gate.run(null), TypeError);
    assert.equal(await active, 'saved');
});
