// SPDX-License-Identifier: GPL-3.0-only
// Interaction pattern adapted from Gradia Capture's GPL-3.0 toolbar.

import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';

import {Slider} from 'resource:///org/gnome/shell/ui/slider.js';

import {
    LINE_WIDTH_MAX,
    LINE_WIDTH_MIN,
    TOOL_COLORS,
    TOOL_DEFINITIONS,
} from './toolDefinitions.js';

function normalizedLineWidth(lineWidth) {
    return (lineWidth - LINE_WIDTH_MIN) /
        (LINE_WIDTH_MAX - LINE_WIDTH_MIN);
}

export const CompactToolbar = GObject.registerClass({
    Signals: {
        'tool-changed': {param_types: [GObject.TYPE_STRING]},
        'color-changed': {param_types: [GObject.TYPE_STRING]},
        'line-width-changed': {param_types: [GObject.TYPE_DOUBLE]},
        undo: {},
        clear: {},
    },
}, class CompactToolbar extends St.BoxLayout {
    _init(params = {}) {
        const {state, ...actorParams} = params;
        if (!state)
            throw new TypeError('CompactToolbar requires a ToolbarState');

        super._init({
            style_class: 'screenshot-ui-panel compact-capture-toolbar',
            accessible_name: 'Annotation tools',
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.START,
            y_expand: true,
            reactive: true,
            ...actorParams,
        });

        this._state = state;
        this._toolButtons = new Map();
        this._colorButtons = new Map();

        this._buildToolButtons();
        this._addSeparator();
        this._buildColorButtons();
        this._addSeparator();
        this._buildLineWidthSlider();
        this._addSeparator();
        this._buildActionButtons();

        this._syncToolButtons();
        this._syncColorButtons();
        this.setActionSensitivity({canUndo: false, canClear: false});
    }

    get selectedTool() {
        return this._state.tool;
    }

    get selectedColor() {
        return this._state.color;
    }

    get lineWidth() {
        return this._state.lineWidth;
    }

    setActionSensitivity({canUndo, canClear}) {
        this._undoButton.reactive = canUndo;
        this._undoButton.can_focus = canUndo;
        this._clearButton.reactive = canClear;
        this._clearButton.can_focus = canClear;
    }

    _buildToolButtons() {
        for (const tool of TOOL_DEFINITIONS) {
            const button = new St.Button({
                child: new St.Icon({icon_name: tool.iconName}),
                style_class: 'compact-capture-icon-button',
                accessible_name: tool.label,
                toggle_mode: true,
                can_focus: true,
                y_align: Clutter.ActorAlign.CENTER,
            });
            button.connect('clicked', () => this._selectTool(tool.id));
            this.add_child(button);
            this._toolButtons.set(tool.id, button);
        }
    }

    _buildColorButtons() {
        for (const color of TOOL_COLORS) {
            const swatch = new St.Widget({
                style_class: 'compact-capture-color-swatch',
                style: `background-color: ${color.value};`,
            });
            const button = new St.Button({
                child: swatch,
                style_class: 'compact-capture-color-button',
                accessible_name: color.name,
                toggle_mode: true,
                can_focus: true,
                y_align: Clutter.ActorAlign.CENTER,
            });
            button.connect('clicked', () => this._selectColor(color.value));
            this.add_child(button);
            this._colorButtons.set(color.value, button);
        }
    }

    _buildLineWidthSlider() {
        this._lineWidthSlider = new Slider(
            normalizedLineWidth(this._state.lineWidth)
        );
        this._lineWidthSlider.add_style_class_name(
            'compact-capture-line-width'
        );
        this._lineWidthSlider.set({
            accessible_name: 'Line width',
            can_focus: true,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._lineWidthSlider.connect('notify::value', () => {
            const lineWidth = LINE_WIDTH_MIN +
                this._lineWidthSlider.value *
                (LINE_WIDTH_MAX - LINE_WIDTH_MIN);
            this._state.setLineWidth(lineWidth);
            this.emit('line-width-changed', lineWidth);
        });
        this.add_child(this._lineWidthSlider);
    }

    _buildActionButtons() {
        this._undoButton = this._createActionButton(
            'edit-undo-symbolic',
            'Undo',
            () => this.emit('undo')
        );
        this._clearButton = this._createActionButton(
            'edit-clear-all-symbolic',
            'Clear all annotations',
            () => this.emit('clear')
        );
    }

    _createActionButton(iconName, accessibleName, callback) {
        const button = new St.Button({
            child: new St.Icon({icon_name: iconName}),
            style_class: 'compact-capture-icon-button',
            accessible_name: accessibleName,
            can_focus: true,
            y_align: Clutter.ActorAlign.CENTER,
        });
        button.connect('clicked', callback);
        this.add_child(button);
        return button;
    }

    _addSeparator() {
        this.add_child(new St.Widget({
            style_class: 'compact-capture-separator',
            y_expand: true,
        }));
    }

    _selectTool(tool) {
        this._state.selectTool(tool);
        this._syncToolButtons();
        this.emit('tool-changed', tool);
    }

    _selectColor(color) {
        this._state.selectColor(color);
        this._syncColorButtons();
        this.emit('color-changed', color);
    }

    _syncToolButtons() {
        for (const [tool, button] of this._toolButtons)
            button.checked = tool === this._state.tool;
    }

    _syncColorButtons() {
        for (const [color, button] of this._colorButtons)
            button.checked = color === this._state.color;
    }
});
