// SPDX-License-Identifier: GPL-3.0-only

import {isSupportedTool} from './toolDefinitions.js';

function clonePoint(point) {
    if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y))
        throw new TypeError('A point must contain finite x and y coordinates');

    return {x: point.x, y: point.y};
}

function cloneStroke(stroke) {
    return {
        tool: stroke.tool,
        color: stroke.color,
        width: stroke.width,
        points: stroke.points.map(clonePoint),
    };
}

export class AnnotationDocument {
    #redoStrokes = [];
    #strokes = [];
    #draft = null;

    get size() {
        return this.#strokes.length;
    }

    get hasAnnotations() {
        return this.#strokes.length > 0;
    }

    get isDrawing() {
        return this.#draft !== null;
    }

    get canUndo() {
        return this.#draft !== null || this.#strokes.length > 0;
    }

    get canRedo() {
        return this.#draft === null && this.#redoStrokes.length > 0;
    }

    beginStroke({tool, color, width, point}) {
        if (this.#draft)
            throw new Error('A stroke is already in progress');
        if (!isSupportedTool(tool))
            throw new TypeError(`Unsupported annotation tool: ${tool}`);
        if (typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color))
            throw new TypeError('Color must use #RRGGBB notation');
        if (!Number.isFinite(width) || width <= 0)
            throw new TypeError('Stroke width must be positive');

        this.#draft = {
            tool,
            color: color.toLowerCase(),
            width,
            points: [clonePoint(point)],
        };
    }

    appendPoint(point) {
        if (!this.#draft)
            throw new Error('No stroke is in progress');

        const next = clonePoint(point);
        const previous = this.#draft.points.at(-1);
        if (next.x !== previous.x || next.y !== previous.y)
            this.#draft.points.push(next);
    }

    replaceEndPoint(point) {
        if (!this.#draft)
            throw new Error('No stroke is in progress');

        const next = clonePoint(point);
        if (this.#draft.points.length === 1)
            this.#draft.points.push(next);
        else
            this.#draft.points[this.#draft.points.length - 1] = next;
    }

    commitStroke() {
        if (!this.#draft)
            return false;

        if (this.#draft.points.length >= 2) {
            this.#strokes.push(this.#draft);
            this.#redoStrokes = [];
            this.#draft = null;
            return true;
        }

        this.#draft = null;
        return false;
    }

    cancelStroke() {
        this.#draft = null;
    }

    undo() {
        if (this.#draft) {
            this.#draft = null;
            return true;
        }

        const stroke = this.#strokes.pop();
        if (!stroke)
            return false;

        this.#redoStrokes.push(stroke);
        return true;
    }

    redo() {
        if (this.#draft)
            return false;

        const stroke = this.#redoStrokes.pop();
        if (!stroke)
            return false;

        this.#strokes.push(stroke);
        return true;
    }

    clear() {
        this.#draft = null;
        this.#strokes = [];
        this.#redoStrokes = [];
    }

    snapshot({includeDraft = false} = {}) {
        const strokes = this.#strokes.map(cloneStroke);
        if (includeDraft && this.#draft)
            strokes.push(cloneStroke(this.#draft));
        return strokes;
    }
}
