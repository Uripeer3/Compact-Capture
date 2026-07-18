// SPDX-License-Identifier: GPL-3.0-only

export const ShortcutAction = Object.freeze({
    REDO: 'redo',
    UNDO: 'undo',
});

export function shortcutAction({key, control = false, shift = false}) {
    const normalizedKey = key?.toLowerCase();

    if (!control)
        return null;

    if (normalizedKey === 'z') {
        return shift
            ? ShortcutAction.REDO
            : ShortcutAction.UNDO;
    }

    if (normalizedKey === 'y' && !shift)
        return ShortcutAction.REDO;

    return null;
}
