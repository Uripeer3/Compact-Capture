// SPDX-License-Identifier: GPL-3.0-only

import assert from 'node:assert/strict';
import test from 'node:test';

import {
    AnnotatedOutputBridge,
} from '../src/shell/annotatedOutputBridge.js';

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return {promise, resolve, reject};
}

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
    const screenshotUi = {_cursor: actor, _cursorScale: 1.5};
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

test('does not restore into a replacement cursor actor', async () => {
    const nativeEntered = deferred();
    const nativeFinished = deferred();
    const outputContent = {};
    const setup = fixture({
        createOutput: async () => ({
            content: outputContent,
            x: 10,
            y: 10,
            scale: 0.5,
        }),
        nativeSave() {
            nativeEntered.resolve();
            return nativeFinished.promise;
        },
    });

    const save = setup.save();
    await nativeEntered.promise;
    const replacement = {
        content: {replacement: true},
        visible: false,
        opacity: 17,
        x: 1,
        y: 2,
    };
    setup.screenshotUi._cursor = replacement;
    setup.screenshotUi._cursorScale = 3;
    nativeFinished.resolve('saved');

    assert.equal(await save, 'saved');
    assert.equal(replacement.content.replacement, true);
    assert.equal(replacement.opacity, 17);
    assert.equal(setup.screenshotUi._cursorScale, 3);
    assert.equal(setup.actor.content, outputContent);
});

test('session invalidation prevents a late save from restoring newer state', async () => {
    const nativeEntered = deferred();
    const nativeFinished = deferred();
    const setup = fixture({
        createOutput: async () => ({
            content: {},
            x: 10,
            y: 10,
            scale: 0.5,
        }),
        nativeSave() {
            nativeEntered.resolve();
            return nativeFinished.promise;
        },
    });

    const save = setup.save();
    await nativeEntered.promise;
    setup.bridge.invalidate();
    assert.equal(setup.actor.content, setup.originalContent);

    const nextSessionContent = {};
    setup.actor.content = nextSessionContent;
    setup.actor.opacity = 101;
    setup.screenshotUi._cursorScale = 2;
    nativeFinished.resolve('saved');

    assert.equal(await save, 'saved');
    assert.equal(setup.actor.content, nextSessionContent);
    assert.equal(setup.actor.opacity, 101);
    assert.equal(setup.screenshotUi._cursorScale, 2);
});

test('invalidation during rendering prevents stale output installation', async () => {
    const renderEntered = deferred();
    const renderFinished = deferred();
    const outputContent = {};
    const setup = fixture({
        createOutput: async () => {
            renderEntered.resolve();
            await renderFinished.promise;
            return {
                content: outputContent,
                x: 10,
                y: 10,
                scale: 0.5,
            };
        },
        nativeSave() {
            assert.equal(this._cursor.content, setup.originalContent);
            return 'native';
        },
    });

    const save = setup.save();
    await renderEntered.promise;
    setup.bridge.invalidate();
    renderFinished.resolve();

    assert.equal(await save, 'native');
    assert.equal(setup.actor.content, setup.originalContent);
});

test('reentrant invalidation stops a partially installed output', async () => {
    const outputContent = {};
    const setup = fixture({
        createOutput: async () => ({
            content: outputContent,
            x: 10,
            y: 10,
            scale: 0.5,
        }),
        nativeSave() {
            assert.equal(this._cursor.content, setup.originalContent);
            assert.equal(this._cursor.opacity, 255);
            return 'native';
        },
    });
    const setContent = setup.actor.set_content;
    setup.actor.set_content = function (content) {
        setContent.call(this, content);
        if (content === outputContent)
            setup.bridge.invalidate();
    };

    assert.equal(await setup.save(), 'native');
    assert.equal(setup.actor.content, setup.originalContent);
    assert.equal(setup.actor.opacity, 255);
    assert.equal(setup.errors.length, 1);
});

test('restores independent cursor properties when content restoration fails', async () => {
    const outputContent = {};
    const setup = fixture({
        createOutput: async () => ({
            content: outputContent,
            x: 10,
            y: 10,
            scale: 0.5,
        }),
        nativeSave() {
            return 'saved';
        },
    });
    const setContent = setup.actor.set_content;
    setup.actor.set_content = function (content) {
        if (content === setup.originalContent)
            throw new Error('content restore failed');
        setContent.call(this, content);
    };

    assert.equal(await setup.save(), 'saved');
    assert.equal(setup.actor.content, outputContent);
    assert.equal(setup.actor.x, 20);
    assert.equal(setup.actor.y, 30);
    assert.equal(setup.actor.visible, true);
    assert.equal(setup.actor.opacity, 255);
    assert.equal(setup.screenshotUi._cursorScale, 1.5);
    assert.equal(setup.errors.length, 1);
    assert.match(setup.errors[0][0], /cursor content/);
});
