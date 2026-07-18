// SPDX-License-Identifier: GPL-3.0-only
// Tooltip interaction adapted from GNOME Shell and Gradia Capture.

import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';

const GAP = 6;
const SHOW_DELAY_MS = 300;

export const CompactTooltip = GObject.registerClass(
class CompactTooltip extends St.Label {
    _init(widget, text) {
        super._init({
            text,
            style_class: 'screenshot-ui-tooltip',
            visible: false,
        });

        this._widget = widget;
        this._timeoutId = 0;
        this._hoverSignalId = widget.connect('notify::hover', () => {
            if (widget.hover)
                this.open();
            else
                this.close();
        });
        this._reactiveSignalId = widget.connect(
            'notify::reactive',
            () => {
                if (!widget.reactive)
                    this.close();
            }
        );
        this._mappedSignalId = widget.connect(
            'notify::mapped',
            () => {
                if (!widget.mapped)
                    this.close();
            }
        );
        this._widgetDestroySignalId = widget.connect(
            'destroy',
            () => this.destroy()
        );
        this.connect('destroy', () => this._cleanup());
    }

    open() {
        if (this._timeoutId || this.visible)
            return;

        this._timeoutId = GLib.timeout_add_once(
            GLib.PRIORITY_DEFAULT,
            SHOW_DELAY_MS,
            () => {
                this._timeoutId = 0;
                this._showBelowOrAbove();
            }
        );
        GLib.Source.set_name_by_id(
            this._timeoutId,
            '[compact-capture] tooltip.open'
        );
    }

    close() {
        this._cancelTimeout();
        this.remove_all_transitions();
        this.opacity = 0;
        this.hide();
    }

    _showBelowOrAbove() {
        if (!this._widget?.hover || !this._widget.reactive ||
            !this._widget.mapped || !this.get_parent()) {
            return;
        }

        this.opacity = 0;
        this.show();

        const extents = this._widget.get_transformed_extents();
        const centeredX = extents.get_x() +
            Math.floor((extents.get_width() - this.width) / 2);
        const stageX = Math.clamp(
            centeredX,
            0,
            global.stage.width - this.width
        );

        const belowY = extents.get_y() + extents.get_height() + GAP;
        const aboveY = extents.get_y() - this.height - GAP;
        const stageY = belowY + this.height <= global.stage.height
            ? belowY
            : Math.max(0, aboveY);
        const [ok, localX, localY] =
            this.get_parent().transform_stage_point(stageX, stageY);
        if (!ok) {
            this.hide();
            return;
        }

        this.set_position(localX, localY);
        this.ease({
            opacity: 255,
            duration: 150,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
        });
    }

    _cancelTimeout() {
        if (!this._timeoutId)
            return;

        GLib.source_remove(this._timeoutId);
        this._timeoutId = 0;
    }

    _cleanup() {
        this._cancelTimeout();
        this.remove_all_transitions();

        if (!this._widget)
            return;

        try {
            if (this._hoverSignalId)
                this._widget.disconnect(this._hoverSignalId);
            if (this._reactiveSignalId)
                this._widget.disconnect(this._reactiveSignalId);
            if (this._mappedSignalId)
                this._widget.disconnect(this._mappedSignalId);
            if (this._widgetDestroySignalId)
                this._widget.disconnect(this._widgetDestroySignalId);
        } catch {
            // The widget may already be in its own destroy sequence.
        }

        this._hoverSignalId = 0;
        this._reactiveSignalId = 0;
        this._mappedSignalId = 0;
        this._widgetDestroySignalId = 0;
        this._widget = null;
    }
});
