// SPDX-License-Identifier: GPL-3.0-only

import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';
import {
    gettext as _,
} from 'resource:///org/gnome/shell/extensions/extension.js';

export const SELECTION_HINT_TEXT =
    _('Drag to select an area, or press C then Enter for full screen');

export const SelectionHint = GObject.registerClass(
class SelectionHint extends St.Label {
    _init(params = {}) {
        super._init({
            text: SELECTION_HINT_TEXT,
            accessible_name: SELECTION_HINT_TEXT,
            style_class: 'screenshot-ui-panel compact-capture-selection-hint',
            reactive: false,
            can_focus: false,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
            ...params,
        });
    }
});
