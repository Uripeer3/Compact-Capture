// SPDX-License-Identifier: GPL-3.0-only

import {
    isSupportedColor,
    isSupportedTool,
    LINE_WIDTH_MAX,
    LINE_WIDTH_MIN,
    Tool,
} from './toolDefinitions.js';

export class ToolbarState {
    #color;
    #lineWidth;
    #tool;

    constructor({
        tool = Tool.FREEHAND,
        color = '#ed333b',
        lineWidth = 3,
    } = {}) {
        this.selectTool(tool);
        this.selectColor(color);
        this.setLineWidth(lineWidth);
    }

    get tool() {
        return this.#tool;
    }

    get color() {
        return this.#color;
    }

    get lineWidth() {
        return this.#lineWidth;
    }

    selectTool(tool) {
        if (!isSupportedTool(tool))
            throw new TypeError(`Unsupported annotation tool: ${tool}`);
        this.#tool = tool;
    }

    selectColor(color) {
        if (!isSupportedColor(color))
            throw new TypeError(`Unsupported annotation color: ${color}`);
        this.#color = color;
    }

    setLineWidth(lineWidth) {
        if (!Number.isFinite(lineWidth) ||
            lineWidth < LINE_WIDTH_MIN || lineWidth > LINE_WIDTH_MAX) {
            throw new RangeError(
                `Line width must be between ${LINE_WIDTH_MIN} and ${LINE_WIDTH_MAX}`
            );
        }
        this.#lineWidth = lineWidth;
    }

    snapshot() {
        return Object.freeze({
            tool: this.#tool,
            color: this.#color,
            lineWidth: this.#lineWidth,
        });
    }
}
