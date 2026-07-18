// SPDX-License-Identifier: GPL-3.0-only
// Interaction pattern adapted from Gradia Capture's GPL-3.0 toolbar.

import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import St from 'gi://St';

import {Slider} from 'resource:///org/gnome/shell/ui/slider.js';

import {CompactTooltip} from './compactTooltip.js';
import {
    OBSCURE_INTENSITY_MAX,
    OBSCURE_INTENSITY_MIN,
    ObscureTreatment,
} from '../core/obscureDefinitions.js';
import {
    LINE_WIDTH_MAX,
    LINE_WIDTH_MIN,
    TOOL_COLORS,
    TOOL_DEFINITIONS,
    Tool,
} from '../core/toolDefinitions.js';

function normalizedLineWidth(lineWidth) {
    return (lineWidth - LINE_WIDTH_MIN) /
        (LINE_WIDTH_MAX - LINE_WIDTH_MIN);
}

function normalizedObscureIntensity(intensity) {
    return (intensity - OBSCURE_INTENSITY_MIN) /
        (OBSCURE_INTENSITY_MAX - OBSCURE_INTENSITY_MIN);
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
        'obscure-treatment-changed': {param_types: [GObject.TYPE_STRING]},
        'obscure-intensity-changed': {param_types: [GObject.TYPE_DOUBLE]},
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
        this._treatmentButtons = new Map();
        this._tooltip = new CompactTooltip();
        this._inputEnabled = true;
        this._actionSensitivity = {
            canUndo: false,
            canRedo: false,
            canClear: false,
        };

        this._buildToolButtons();
        this._addSeparator();
        this._buildColorButtons();
        this._buildTreatmentButtons();
        this._addSeparator();
        this._buildLineWidthSlider();
        this._addSeparator();
        this._buildActionButtons();

        this._syncToolButtons();
        this._syncColorButtons();
        this._syncToolSpecificControls();
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
        this._actionSensitivity = {canUndo, canRedo, canClear};
        this._syncControlSensitivity();
    }

    setInputEnabled(enabled) {
        const normalized = Boolean(enabled);
        if (this._inputEnabled === normalized)
            return;

        this._inputEnabled = normalized;
        this._syncControlSensitivity();
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
        this._colorGroup = new St.BoxLayout({
            style_class: 'compact-capture-control-group',
        });
        this.add_child(this._colorGroup);
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
            this._colorGroup.add_child(button);
            this._colorButtons.set(color.value, button);
            this._attachTooltip(button, `${color.name} color`);
        }
    }

    _buildTreatmentButtons() {
        this._treatmentGroup = new St.BoxLayout({
            style_class: 'compact-capture-control-group',
        });
        this.add_child(this._treatmentGroup);
        const treatments = [
            {
                id: ObscureTreatment.PIXELATE,
                label: 'Pixelate',
                iconFile: 'icons/pixelate-symbolic.svg',
            },
            {
                id: ObscureTreatment.BLUR,
                label: 'Blur',
                iconFile: 'icons/blur-symbolic.svg',
            },
        ];

        for (const treatment of treatments) {
            const button = new St.Button({
                child: createToolIcon(treatment, this._extensionPath),
                style_class: 'compact-capture-icon-button',
                accessible_name: treatment.label,
                toggle_mode: true,
                can_focus: true,
                y_align: Clutter.ActorAlign.CENTER,
            });
            button.connect('clicked', () =>
                this._selectObscureTreatment(treatment.id)
            );
            this._treatmentGroup.add_child(button);
            this._treatmentButtons.set(treatment.id, button);
            this._attachTooltip(button, treatment.label);
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

            if (this._state.tool === Tool.OBSCURE) {
                const intensity = OBSCURE_INTENSITY_MIN +
                    this._lineWidthSlider.value *
                    (OBSCURE_INTENSITY_MAX - OBSCURE_INTENSITY_MIN);
                this._state.setObscureIntensity(intensity);
                this.emit('obscure-intensity-changed', intensity);
            } else {
                const lineWidth = LINE_WIDTH_MIN +
                    this._lineWidthSlider.value *
                    (LINE_WIDTH_MAX - LINE_WIDTH_MIN);
                this._state.setLineWidth(lineWidth);
                this.emit('line-width-changed', lineWidth);
            }
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

    _setControlSensitivity(control, sensitive) {
        if (control.reactive === sensitive &&
            control.can_focus === sensitive) {
            return;
        }

        if (!sensitive)
            this._tooltip.closeFor(control);
        control.reactive = sensitive;
        control.can_focus = sensitive;
    }

    _syncControlSensitivity() {
        for (const button of this._toolButtons.values())
            this._setControlSensitivity(button, this._inputEnabled);
        for (const button of this._colorButtons.values())
            this._setControlSensitivity(button, this._inputEnabled);
        for (const button of this._treatmentButtons.values())
            this._setControlSensitivity(button, this._inputEnabled);
        this._setControlSensitivity(
            this._lineWidthSlider,
            this._inputEnabled
        );

        const {canUndo, canRedo, canClear} = this._actionSensitivity;
        this._setControlSensitivity(
            this._undoButton,
            this._inputEnabled && canUndo
        );
        this._setControlSensitivity(
            this._redoButton,
            this._inputEnabled && canRedo
        );
        this._setControlSensitivity(
            this._clearButton,
            this._inputEnabled && canClear
        );
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
        this._syncToolSpecificControls();
        this.emit('tool-changed', tool);
    }

    _selectColor(color) {
        this._state.selectColor(color);
        this._syncColorButtons();
        this.emit('color-changed', color);
    }

    _selectObscureTreatment(treatment) {
        this._state.setObscureTreatment(treatment);
        this._syncTreatmentButtons();
        this.emit('obscure-treatment-changed', treatment);
    }

    _syncToolButtons() {
        for (const [tool, button] of this._toolButtons)
            button.checked = tool === this._state.tool;
    }

    _syncColorButtons() {
        for (const [color, button] of this._colorButtons)
            button.checked = color === this._state.color;
    }

    _syncTreatmentButtons() {
        for (const [treatment, button] of this._treatmentButtons)
            button.checked = treatment === this._state.obscureTreatment;
    }

    _syncToolSpecificControls() {
        const obscure = this._state.tool === Tool.OBSCURE;
        this._colorGroup.visible = !obscure;
        this._treatmentGroup.visible = obscure;
        this._syncTreatmentButtons();

        const label = obscure ? 'Effect intensity' : 'Line width';
        this._lineWidthSlider.accessible_name = label;
        this._tooltip.setText(this._lineWidthSlider, label);
        this._syncLineWidthSlider();
    }

    _syncLineWidthSlider() {
        const value = this._state.tool === Tool.OBSCURE
            ? normalizedObscureIntensity(this._state.obscureIntensity)
            : normalizedLineWidth(this._state.lineWidth);
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
