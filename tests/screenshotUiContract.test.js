// SPDX-License-Identifier: GPL-3.0-only

import assert from 'node:assert/strict';
import test from 'node:test';

import {
    inspectScreenshotUi,
    SUPPORTED_SHELL_MAJORS,
} from '../src/screenshotUiContract.js';

function compatibleUi() {
    class MockScreenshotUi {
        visible = false;

        open() {}
        connect() {}
        disconnect() {}
    }

    return new MockScreenshotUi();
}

test('accepts the supported GNOME Shell major version', () => {
    const result = inspectScreenshotUi('50.2', compatibleUi());

    assert.equal(result.compatible, true);
    assert.equal(result.shellMajor, 50);
    assert.deepEqual(result.issues, []);
    assert.deepEqual(SUPPORTED_SHELL_MAJORS, [50]);
});

test('fails open on unsupported and malformed versions', () => {
    const unsupported = inspectScreenshotUi('49.6', compatibleUi());
    const malformed = inspectScreenshotUi('development', compatibleUi());

    assert.equal(unsupported.compatible, false);
    assert.equal(unsupported.shellMajor, 49);
    assert.match(unsupported.issues[0], /unsupported/);
    assert.equal(malformed.compatible, false);
    assert.equal(malformed.shellMajor, null);
});

test('reports a missing ScreenshotUI object', () => {
    const result = inspectScreenshotUi('50', null);

    assert.equal(result.compatible, false);
    assert.deepEqual(result.issues, ['Main.screenshotUI is unavailable']);
});

test('reports every missing contract member instead of failing at first use', () => {
    const result = inspectScreenshotUi('50', {open() {}});

    assert.equal(result.compatible, false);
    assert.deepEqual(result.issues, [
        'Main.screenshotUI.connect is unavailable',
        'Main.screenshotUI.disconnect is unavailable',
        'Main.screenshotUI.visible is unavailable',
        'Main.screenshotUI.open is not defined on its direct prototype',
    ]);
});
