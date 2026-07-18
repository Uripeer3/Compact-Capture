// SPDX-License-Identifier: GPL-3.0-only

import {isSupportedTool} from './toolDefinitions.js';

export const MAX_DOCUMENT_POINTS = 65_536;
export const MAX_DOCUMENT_STROKES = 1_024;

function validateLimit(value, name, minimum) {
    if (!Number.isInteger(value) || value < minimum)
        throw new RangeError(`${name} must be an integer of at least ${minimum}`);
    return value;
}

function createPoint(point) {
    if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y))
        throw new TypeError('A point must contain finite x and y coordinates');

    return Object.freeze({x: point.x, y: point.y});
}

function clonePoint(point) {
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

class PointView {
    #points;

    constructor(points) {
        this.#points = points;
        Object.freeze(this);
    }

    get length() {
        return this.#points.length;
    }

    at(index) {
        return this.#points.at(index);
    }

    *[Symbol.iterator]() {
        yield* this.#points;
    }
}

function draftView(stroke) {
    return Object.freeze({
        tool: stroke.tool,
        color: stroke.color,
        width: stroke.width,
        points: new PointView(stroke.points),
    });
}

function freezeStroke(stroke) {
    Object.freeze(stroke.points);
    return Object.freeze(stroke);
}

export class AnnotationDocument {
    #cachedRenderView = null;
    #committedRevision = 0;
    #committedView = Object.freeze([]);
    #draft = null;
    #draftRevision = 0;
    #draftView = null;
    #maxPoints;
    #maxStrokes;
    #redoStrokes = [];
    #storedPointCount = 0;
    #strokes = [];

    constructor({
        maxPoints = MAX_DOCUMENT_POINTS,
        maxStrokes = MAX_DOCUMENT_STROKES,
    } = {}) {
        this.#maxPoints = validateLimit(maxPoints, 'Point limit', 2);
        this.#maxStrokes = validateLimit(maxStrokes, 'Stroke limit', 1);
    }

    get size() {
        return this.#strokes.length;
    }

    get pointCount() {
        return this.#storedPointCount;
    }

    get hasAnnotations() {
        return this.#strokes.length > 0;
    }

    get isDrawing() {
        return this.#draft !== null;
    }

    get canAppendPoint() {
        return this.#draft !== null &&
            this.#storedPointCount < this.#maxPoints;
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

        const firstPoint = createPoint(point);
        const storedStrokeCount =
            this.#strokes.length + this.#redoStrokes.length;
        if (storedStrokeCount >= this.#maxStrokes ||
            this.#storedPointCount > this.#maxPoints - 2) {
            return false;
        }

        this.#draft = {
            tool,
            color: color.toLowerCase(),
            width,
            points: [firstPoint],
        };
        this.#draftView = draftView(this.#draft);
        this.#storedPointCount++;
        this.#touchDraft();
        return true;
    }

    appendPoint(point) {
        if (!this.#draft)
            throw new Error('No stroke is in progress');

        const next = createPoint(point);
        const previous = this.#draft.points.at(-1);
        if (next.x === previous.x && next.y === previous.y)
            return false;
        if (!this.canAppendPoint)
            return false;

        this.#draft.points.push(next);
        this.#storedPointCount++;
        this.#touchDraft();
        return true;
    }

    replaceEndPoint(point) {
        if (!this.#draft)
            throw new Error('No stroke is in progress');

        const next = createPoint(point);
        if (this.#draft.points.length === 1) {
            if (!this.canAppendPoint)
                return false;
            this.#draft.points.push(next);
            this.#storedPointCount++;
        } else {
            this.#draft.points[this.#draft.points.length - 1] = next;
        }
        this.#touchDraft();
        return true;
    }

    commitStroke() {
        if (!this.#draft)
            return false;

        const stroke = this.#draft;
        this.#draft = null;
        this.#draftView = null;
        this.#touchDraft();

        if (stroke.points.length < 2) {
            this.#storedPointCount -= stroke.points.length;
            return false;
        }

        for (const redoStroke of this.#redoStrokes)
            this.#storedPointCount -= redoStroke.points.length;
        this.#redoStrokes = [];
        this.#strokes.push(freezeStroke(stroke));
        this.#touchCommitted();
        return true;
    }

    cancelStroke() {
        if (!this.#draft)
            return false;

        this.#storedPointCount -= this.#draft.points.length;
        this.#draft = null;
        this.#draftView = null;
        this.#touchDraft();
        return true;
    }

    undo() {
        if (this.#draft)
            return this.cancelStroke();

        const stroke = this.#strokes.pop();
        if (!stroke)
            return false;

        this.#redoStrokes.push(stroke);
        this.#touchCommitted();
        return true;
    }

    redo() {
        if (this.#draft)
            return false;

        const stroke = this.#redoStrokes.pop();
        if (!stroke)
            return false;

        this.#strokes.push(stroke);
        this.#touchCommitted();
        return true;
    }

    clear() {
        const hadCommitted = this.#strokes.length > 0;
        const hadDraft = this.#draft !== null;

        this.#draft = null;
        this.#draftView = null;
        this.#strokes = [];
        this.#redoStrokes = [];
        this.#storedPointCount = 0;

        if (hadCommitted)
            this.#touchCommitted();
        if (hadDraft)
            this.#touchDraft();
    }

    renderView() {
        if (!this.#cachedRenderView) {
            this.#cachedRenderView = Object.freeze({
                committedRevision: this.#committedRevision,
                draftRevision: this.#draftRevision,
                committed: this.#committedView,
                draft: this.#draftView,
            });
        }
        return this.#cachedRenderView;
    }

    snapshot({includeDraft = false} = {}) {
        const strokes = this.#strokes.map(cloneStroke);
        if (includeDraft && this.#draft)
            strokes.push(cloneStroke(this.#draft));
        return strokes;
    }

    #touchCommitted() {
        this.#committedRevision++;
        this.#committedView = Object.freeze([...this.#strokes]);
        this.#cachedRenderView = null;
    }

    #touchDraft() {
        this.#draftRevision++;
        this.#cachedRenderView = null;
    }
}
