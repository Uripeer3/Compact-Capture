// SPDX-License-Identifier: GPL-3.0-only
// Interaction pattern adapted from Gradia Capture's GPL-3.0 toolbar.

import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import St from 'gi://St';

import {Slider} from 'resource:///org/gnome/shell/ui/slider.js';

import {CompactTooltip} from './compactTooltip.js';
import {
    LINE_WIDTH_MAX,
    LINE_WIDTH_MIN,
    TOOL_COLORS,
    TOOL_DEFINITIONS,
} from '../core/toolDefinitions.js';

function normalizedLineWidth(lineWidth) {
    return (lineWidth - LINE_WIDTH_MIN) /
        (LINE_WIDTH_MAX - LINE_WIDTH_MIN);
}

function createToolIcon(tool, extensionPath) {
    if (tool.iconFile) {
        return new St.Icon({
            gicon: Gio.Icon.new_for_string(
                `${extensionPath}/${tool.iconFile}`
            ),
        });
    }

    return new St.Icon({icon_name: tool.iconName});
}

export const CompactToolbar = GObject.registerClass({
    Signals: {
        'tool-changed': {param_types: [GObject.TYPE_STRING]},
        'color-changed': {param_types: [GObject.TYPE_STRING]},
        'line-width-changed': {param_types: [GObject.TYPE_DOUBLE]},
        undo: {},
        redo: {},
        clear: {},
    },
}, class CompactToolbar extends St.BoxLayout {
    _init(params = {}) {
        const {state, extensionPath = '', ...actorParams} = params;
        if (!state)
            throw new TypeError('CompactToolbar requires a ToolbarState');
        if (!extensionPath)
            throw new TypeError('CompactToolbar requires an extension path');

        super._init({
            style_class: 'screenshot-ui-panel compact-capture-toolbar',
            accessible_name: 'Annotation tools',
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.START,
            x_expand: false,
            y_expand: false,
            reactive: true,
            ...actorParams,
        });

        this._state = state;
        this._extensionPath = extensionPath;
        this._toolButtons = new Map();
        this._colorButtons = new Map();
        this._tooltip = new CompactTooltip();

        this._buildToolButtons();
        this._addSeparator();
        this._buildColorButtons();
        this._addSeparator();
        this._buildLineWidthSlider();
        this._addSeparator();
        this._buildActionButtons();

        this._syncToolButtons();
        this._syncColorButtons();
        this.setActionSensitivity({
            canUndo: false,
            canRedo: false,
            canClear: false,
        });
        this.connect('destroy', () => this._destroyTooltip());
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

    get auxiliaryActors() {
        return [this._tooltip];
    }

    setActionSensitivity({canUndo, canRedo, canClear}) {
        this._setButtonSensitivity(this._undoButton, canUndo);
        this._setButtonSensitivity(this._redoButton, canRedo);
        this._setButtonSensitivity(this._clearButton, canClear);
    }

    _buildToolButtons() {
        for (const tool of TOOL_DEFINITIONS) {
            const button = new St.Button({
                child: createToolIcon(tool, this._extensionPath),
                style_class: 'compact-capture-icon-button',
                accessible_name: tool.label,
                toggle_mode: true,
                can_focus: true,
                y_align: Clutter.ActorAlign.CENTER,
            });
            button.connect('clicked', () => this._selectTool(tool.id));
            this.add_child(button);
            this._toolButtons.set(tool.id, button);
            this._attachTooltip(button, tool.label);
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
            this._attachTooltip(button, `${color.name} color`);
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
            if (this._syncingLineWidth)
                return;

            const lineWidth = LINE_WIDTH_MIN +
                this._lineWidthSlider.value *
                (LINE_WIDTH_MAX - LINE_WIDTH_MIN);
            this._state.setLineWidth(lineWidth);
            this.emit('line-width-changed', lineWidth);
        });
        this.add_child(this._lineWidthSlider);
        this._attachTooltip(this._lineWidthSlider, 'Line width');
    }

    _buildActionButtons() {
        this._undoButton = this._createActionButton(
            'edit-undo-symbolic',
            'Undo',
            () => this.emit('undo')
        );
        this._redoButton = this._createActionButton(
            'edit-redo-symbolic',
            'Redo',
            () => this.emit('redo')
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
        this._attachTooltip(button, accessibleName);
        return button;
    }

    _attachTooltip(widget, text) {
        this._tooltip.attach(widget, text);
    }

    _destroyTooltip() {
        this._tooltip?.destroy();
        this._tooltip = null;
    }

    _setButtonSensitivity(button, sensitive) {
        if (button.reactive === sensitive &&
            button.can_focus === sensitive) {
            return;
        }

        if (!sensitive)
            this._tooltip.closeFor(button);
        button.reactive = sensitive;
        button.can_focus = sensitive;
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
        this._syncLineWidthSlider();
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

    _syncLineWidthSlider() {
        const value = normalizedLineWidth(this._state.lineWidth);
        if (this._lineWidthSlider.value === value)
            return;

        this._syncingLineWidth = true;
        try {
            this._lineWidthSlider.value = value;
        } finally {
            this._syncingLineWidth = false;
        }
    }
});
