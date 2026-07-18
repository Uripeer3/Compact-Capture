// SPDX-License-Identifier: GPL-3.0-only

export const ShortcutAction = Object.freeze({
    CANCEL_GESTURE: 'cancel-gesture',
    REDO: 'redo',
    UNDO: 'undo',
});

export function shortcutAction({key, control = false, shift = false}) {
    const normalizedKey = key?.toLowerCase();

    if (normalizedKey === 'escape' && !control && !shift)
        return ShortcutAction.CANCEL_GESTURE;

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
