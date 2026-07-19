// SPDX-License-Identifier: GPL-3.0-only

import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';

export const SELECTION_HINT_TEXT =
    'Drag to select an area, or press C then Enter for full screen';

export const SelectionHint = GObject.registerClass(
class SelectionHint extends St.Label {
    _init(params = {}) {
        const {gettext, ...actorParams} = params;
        if (typeof gettext !== 'function')
            throw new TypeError('SelectionHint gettext must be a function');
        const text = gettext(SELECTION_HINT_TEXT);

        super._init({
            text,
            accessible_name: text,
            style_class: 'screenshot-ui-panel compact-capture-selection-hint',
            reactive: false,
            can_focus: false,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
            ...actorParams,
        });
    }
});
