// SPDX-License-Identifier: GPL-3.0-only

import assert from 'node:assert/strict';
import test from 'node:test';

import {
    shortcutAction,
    ShortcutAction,
} from '../src/core/keyboardShortcuts.js';

test('maps conventional editing shortcuts', () => {
    assert.equal(shortcutAction({key: 'z', control: true}),
        ShortcutAction.UNDO);
    assert.equal(shortcutAction({key: 'Z', control: true, shift: true}),
        ShortcutAction.REDO);
    assert.equal(shortcutAction({key: 'y', control: true}),
        ShortcutAction.REDO);
    assert.equal(shortcutAction({key: 'escape'}),
        ShortcutAction.CANCEL_GESTURE);
});

test('ignores shortcuts owned by GNOME or focused controls', () => {
    assert.equal(shortcutAction({key: 'z'}), null);
    assert.equal(shortcutAction({key: 'c', control: true}), null);
    assert.equal(shortcutAction({key: 'escape', shift: true}), null);
});
