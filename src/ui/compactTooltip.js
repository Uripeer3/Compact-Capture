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
    _init() {
        super._init({
            style_class: 'screenshot-ui-tooltip',
            visible: false,
        });

        this._targets = new Map();
        this._anchor = null;
        this._timeoutId = 0;
        this.connect('destroy', () => this._cleanup());
    }

    attach(widget, text) {
        if (this._targets.has(widget))
            throw new Error('Tooltip target is already attached');

        const target = {
            text,
            focused: false,
            signalIds: [],
        };
        this._targets.set(widget, target);

        target.signalIds.push(
            widget.connect('notify::hover', () => this._sync(widget)),
            widget.connect('key-focus-in', () => {
                target.focused = true;
                this._sync(widget);
            }),
            widget.connect('key-focus-out', () => {
                target.focused = false;
                this._sync(widget);
            }),
            widget.connect('notify::reactive', () => this._sync(widget)),
            widget.connect('notify::mapped', () => this._sync(widget)),
            widget.connect('destroy', () => this._detach(widget))
        );
    }

    closeFor(widget) {
        if (this._anchor !== widget)
            return;

        this.close();
        this._openFocusedTarget(widget);
    }

    setText(widget, text) {
        const target = this._targets.get(widget);
        if (!target)
            throw new Error('Tooltip target is not attached');
        target.text = text;
        if (this._anchor === widget) {
            this.text = text;
            if (this.visible)
                this._showBelowOrAbove();
        }
    }

    close() {
        this._cancelTimeout();
        this.remove_all_transitions();
        this._anchor = null;
        this.opacity = 0;
        this.hide();
    }

    _sync(widget) {
        if (this._isEligible(widget))
            this._openFor(widget);
        else
            this.closeFor(widget);
    }

    _openFor(widget) {
        if (this._anchor === widget && (this._timeoutId || this.visible))
            return;

        const target = this._targets.get(widget);
        if (!target)
            return;

        this.close();
        this._anchor = widget;
        this.text = target.text;
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

    _showBelowOrAbove() {
        if (!this._isEligible(this._anchor) || !this.get_parent()) {
            this.close();
            return;
        }

        this.opacity = 0;
        this.show();

        const extents = this._anchor.get_transformed_extents();
        const centeredX = extents.get_x() +
            Math.floor((extents.get_width() - this.width) / 2);
        const stageX = Math.clamp(
            centeredX,
            0,
            Math.max(0, global.stage.width - this.width)
        );

        const belowY = extents.get_y() + extents.get_height() + GAP;
        const aboveY = extents.get_y() - this.height - GAP;
        const stageY = belowY + this.height <= global.stage.height
            ? belowY
            : Math.max(0, aboveY);
        const [ok, localX, localY] =
            this.get_parent().transform_stage_point(stageX, stageY);
        if (!ok) {
            this.close();
            return;
        }

        this.set_position(localX, localY);
        this.ease({
            opacity: 255,
            duration: 150,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
        });
    }

    _isEligible(widget) {
        const target = this._targets.get(widget);
        return Boolean(target && widget.reactive && widget.mapped &&
            (widget.hover || target.focused));
    }

    _openFocusedTarget(excludedWidget) {
        for (const [widget, target] of this._targets) {
            if (widget !== excludedWidget && target.focused &&
                this._isEligible(widget)) {
                this._openFor(widget);
                return;
            }
        }
    }

    _detach(widget) {
        const target = this._targets.get(widget);
        if (!target)
            return;

        const wasAnchor = this._anchor === widget;
        this._targets.delete(widget);
        if (wasAnchor)
            this.close();

        try {
            for (const signalId of target.signalIds)
                widget.disconnect(signalId);
        } catch {
            // The widget may already be in its own destroy sequence.
        }

        if (wasAnchor)
            this._openFocusedTarget(widget);
    }

    _cancelTimeout() {
        if (!this._timeoutId)
            return;

        GLib.source_remove(this._timeoutId);
        this._timeoutId = 0;
    }

    _cleanup() {
        this.close();
        for (const widget of [...this._targets.keys()])
            this._detach(widget);
        this._targets.clear();
    }
});
