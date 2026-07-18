// SPDX-License-Identifier: GPL-3.0-only

import assert from 'node:assert/strict';
import test from 'node:test';

import {
    AnnotatedOutputBridge,
} from '../src/shell/annotatedOutputBridge.js';

function fixture({createOutput, nativeSave}) {
    const originalContent = {
        get_texture: () => ({
            get_width: () => 32,
            get_height: () => 48,
        }),
    };
    const actor = {
        content: originalContent,
        visible: true,
        opacity: 255,
        x: 20,
        y: 30,
        set_content(content) {
            this.content = content;
        },
        set_position(x, y) {
            this.x = x;
            this.y = y;
        },
    };
    const sourceTexture = {name: 'stage-screenshot'};
    const screenshotUi = {
        _cursor: actor,
        _cursorScale: 1.5,
        _stageScreenshot: {
            get_content: () => ({get_texture: () => sourceTexture}),
        },
    };
    const errors = [];
    const bridge = new AnnotatedOutputBridge({
        screenshotUi,
        createOutput,
        onError: (...args) => errors.push(args),
    });

    return {
        actor,
        bridge,
        errors,
        originalContent,
        screenshotUi,
        sourceTexture,
        save: () => bridge.save({
            screenshotUi,
            originalMethod: nativeSave,
            args: ['native-argument'],
            strokes: [{tool: 'freehand'}],
            selection: {x: 10, y: 10, width: 100, height: 50},
            outputScale: 2,
        }),
    };
}

test('installs one output texture and restores the native cursor', async () => {
    let received = null;
    const outputContent = {};
    const setup = fixture({
        createOutput: async input => {
            received = input;
            return {content: outputContent, x: 10, y: 10, scale: 0.5};
        },
        nativeSave(argument) {
            assert.equal(argument, 'native-argument');
            assert.equal(this._cursor.content, outputContent);
            assert.equal(this._cursor.opacity, 0);
            assert.equal(this._cursorScale, 0.5);
            return 'saved';
        },
    });

    assert.equal(await setup.save(), 'saved');
    assert.deepEqual(received.cursor, {
        texture: received.cursor.texture,
        x: 20,
        y: 30,
        width: 32,
        height: 48,
        scale: 1.5,
    });
    assert.strictEqual(received.sourceTexture, setup.sourceTexture);
    assert.equal(setup.actor.content, setup.originalContent);
    assert.equal(setup.actor.opacity, 255);
    assert.equal(setup.screenshotUi._cursorScale, 1.5);
    assert.deepEqual(setup.errors, []);
});

test('fails open before delegation and restores the native cursor', async () => {
    let saves = 0;
    const setup = fixture({
        createOutput: async () => {
            throw new Error('render failed');
        },
        nativeSave() {
            saves++;
            assert.equal(this._cursor.content, setup.originalContent);
            return 'native';
        },
    });

    assert.equal(await setup.save(), 'native');
    assert.equal(saves, 1);
    assert.equal(setup.errors.length, 1);
});

test('propagates native errors after delegation and still restores', async () => {
    const nativeError = new Error('native failed');
    const setup = fixture({
        createOutput: async () => ({
            content: {},
            x: 10,
            y: 10,
            scale: 0.5,
        }),
        nativeSave() {
            throw nativeError;
        },
    });

    await assert.rejects(setup.save(), nativeError);
    assert.equal(setup.actor.content, setup.originalContent);
    assert.equal(setup.screenshotUi._cursorScale, 1.5);
    assert.deepEqual(setup.errors, []);
});
