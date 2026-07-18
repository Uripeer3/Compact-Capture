// SPDX-License-Identifier: GPL-3.0-only

import {annotationBounds} from './annotationBounds.js';
import {isSupportedTool} from './toolDefinitions.js';

export const MAX_DOCUMENT_POINTS = 65_536;
export const MAX_DOCUMENT_STROKES = 1_024;

export const CommittedChangeType = Object.freeze({
    APPEND: 'append',
    REMOVE: 'remove',
    CLEAR: 'clear',
});

const STROKE_CHUNK_SIZE = 32;

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

// A persistent sequence keeps old render views immutable while limiting a
// history transition to one short chunk copy instead of copying every stroke.
class StrokeSequence {
    #chunks;

    constructor(chunks = [], length = 0) {
        this.#chunks = Object.freeze(chunks);
        this.length = length;
        Object.freeze(this);
    }

    append(stroke) {
        const lastChunk = this.#chunks.at(-1);
        if (!lastChunk || lastChunk.length === STROKE_CHUNK_SIZE) {
            return new StrokeSequence([
                ...this.#chunks,
                Object.freeze([stroke]),
            ], this.length + 1);
        }

        return new StrokeSequence([
            ...this.#chunks.slice(0, -1),
            Object.freeze([...lastChunk, stroke]),
        ], this.length + 1);
    }

    at(index) {
        let offset = index < 0 ? this.length + index : index;
        if (offset < 0 || offset >= this.length)
            return undefined;

        for (const chunk of this.#chunks) {
            if (offset < chunk.length)
                return chunk[offset];
            offset -= chunk.length;
        }
        return undefined;
    }

    pop() {
        const lastChunk = this.#chunks.at(-1);
        if (!lastChunk)
            return null;

        const stroke = lastChunk.at(-1);
        const chunks = lastChunk.length === 1
            ? this.#chunks.slice(0, -1)
            : [
                ...this.#chunks.slice(0, -1),
                Object.freeze(lastChunk.slice(0, -1)),
            ];
        return Object.freeze({
            sequence: new StrokeSequence(chunks, this.length - 1),
            stroke,
        });
    }

    *[Symbol.iterator]() {
        for (const chunk of this.#chunks)
            yield* chunk;
    }
}

export class AnnotationDocument {
    #cachedRenderView = null;
    #committedChange = null;
    #committedRevision = 0;
    #committedView = new StrokeSequence();
    #draft = null;
    #draftView = null;
    #maxPoints;
    #maxStrokes;
    #redoStrokes = [];
    #redoPointCount = 0;
    #storedPointCount = 0;
    #strokes = new StrokeSequence();

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
        const committedPointCount =
            this.#storedPointCount - this.#redoPointCount;
        if (this.#strokes.length >= this.#maxStrokes ||
            committedPointCount > this.#maxPoints - 2) {
            return false;
        }

        // Starting a divergent edit invalidates redo before reserving its
        // first point, so undo always frees capacity for replacement work.
        this.#storedPointCount -= this.#redoPointCount;
        this.#redoPointCount = 0;
        this.#redoStrokes = [];

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

        const committedStroke = freezeStroke(stroke);
        this.#strokes = this.#strokes.append(committedStroke);
        this.#touchCommitted({
            type: CommittedChangeType.APPEND,
            stroke: committedStroke,
            bounds: annotationBounds(committedStroke),
        });
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

        const result = this.#strokes.pop();
        if (!result)
            return false;

        this.#strokes = result.sequence;
        this.#redoStrokes.push(result.stroke);
        this.#redoPointCount += result.stroke.points.length;
        this.#touchCommitted({
            type: CommittedChangeType.REMOVE,
            stroke: result.stroke,
            bounds: annotationBounds(result.stroke),
        });
        return true;
    }

    redo() {
        if (this.#draft)
            return false;

        const stroke = this.#redoStrokes.pop();
        if (!stroke)
            return false;

        this.#redoPointCount -= stroke.points.length;
        this.#strokes = this.#strokes.append(stroke);
        this.#touchCommitted({
            type: CommittedChangeType.APPEND,
            stroke,
            bounds: annotationBounds(stroke),
        });
        return true;
    }

    clear() {
        const hadCommitted = this.#strokes.length > 0;
        const hadDraft = this.#draft !== null;

        this.#draft = null;
        this.#draftView = null;
        this.#strokes = new StrokeSequence();
        this.#redoStrokes = [];
        this.#redoPointCount = 0;
        this.#storedPointCount = 0;

        if (hadCommitted)
            this.#touchCommitted({type: CommittedChangeType.CLEAR});
        if (hadDraft)
            this.#touchDraft();
    }

    renderView() {
        if (!this.#cachedRenderView) {
            this.#cachedRenderView = Object.freeze({
                committedRevision: this.#committedRevision,
                committedChange: this.#committedChange,
                committed: this.#committedView,
                draft: this.#draftView,
            });
        }
        return this.#cachedRenderView;
    }

    snapshot({includeDraft = false} = {}) {
        const strokes = [];
        for (const stroke of this.#strokes)
            strokes.push(cloneStroke(stroke));
        if (includeDraft && this.#draft)
            strokes.push(cloneStroke(this.#draft));
        return strokes;
    }

    #touchCommitted(change) {
        this.#committedRevision++;
        this.#committedView = this.#strokes;
        this.#committedChange = Object.freeze({...change});
        this.#cachedRenderView = null;
    }

    #touchDraft() {
        this.#cachedRenderView = null;
    }
}
