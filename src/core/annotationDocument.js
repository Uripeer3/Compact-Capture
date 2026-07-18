// SPDX-License-Identifier: GPL-3.0-only

import {annotationBounds} from './annotationBounds.js';
import {unionRects} from './geometry.js';
import {
    DEFAULT_OBSCURE_INTENSITY,
    DEFAULT_OBSCURE_TREATMENT,
    MAX_OBSCURE_LOGICAL_AREA,
    obscureArea,
    validateObscureIntensity,
    validateObscureTreatment,
} from './obscureDefinitions.js';
import {isSupportedTool, Tool} from './toolDefinitions.js';

export const MAX_DOCUMENT_POINTS = 65_536;
export const MAX_DOCUMENT_STROKES = 1_024;

export const CommittedChangeType = Object.freeze({
    APPEND: 'append',
    REMOVE: 'remove',
    REPLACE: 'replace',
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
    const clone = {
        tool: stroke.tool,
        color: stroke.color,
        width: stroke.width,
        points: stroke.points.map(clonePoint),
    };
    if (stroke.tool === Tool.OBSCURE) {
        clone.obscureTreatment = stroke.obscureTreatment;
        clone.obscureIntensity = stroke.obscureIntensity;
    }
    return clone;
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

function strokeView(stroke, points) {
    const view = {
        tool: stroke.tool,
        color: stroke.color,
        width: stroke.width,
        points,
    };
    if (stroke.tool === Tool.OBSCURE) {
        view.obscureTreatment = stroke.obscureTreatment;
        view.obscureIntensity = stroke.obscureIntensity;
    }
    return Object.freeze(view);
}

function draftView(stroke) {
    return strokeView(stroke, new PointView(stroke.points));
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

    replaceLast(stroke) {
        const lastChunk = this.#chunks.at(-1);
        if (!lastChunk)
            throw new Error('Cannot replace an empty stroke sequence');
        return new StrokeSequence([
            ...this.#chunks.slice(0, -1),
            Object.freeze([...lastChunk.slice(0, -1), stroke]),
        ], this.length);
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
    #maxObscureArea;
    #maxStrokes;
    #obscureArea = 0;
    #redoStrokes = [];
    #redoPointCount = 0;
    #storedPointCount = 0;
    #strokes = new StrokeSequence();

    constructor({
        maxPoints = MAX_DOCUMENT_POINTS,
        maxStrokes = MAX_DOCUMENT_STROKES,
        maxObscureArea = MAX_OBSCURE_LOGICAL_AREA,
    } = {}) {
        this.#maxPoints = validateLimit(maxPoints, 'Point limit', 2);
        this.#maxStrokes = validateLimit(maxStrokes, 'Stroke limit', 1);
        if (!Number.isFinite(maxObscureArea) || maxObscureArea <= 0)
            throw new RangeError('Obscure area limit must be positive');
        this.#maxObscureArea = maxObscureArea;
    }

    get size() {
        return this.#strokes.length;
    }

    get pointCount() {
        return this.#storedPointCount;
    }

    get obscureArea() {
        return this.#obscureArea;
    }

    get lastCommitted() {
        return this.#strokes.at(-1);
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

    beginStroke({
        tool,
        color,
        width,
        point,
        obscureTreatment = DEFAULT_OBSCURE_TREATMENT,
        obscureIntensity = DEFAULT_OBSCURE_INTENSITY,
    }) {
        if (this.#draft)
            throw new Error('A stroke is already in progress');
        if (!isSupportedTool(tool))
            throw new TypeError(`Unsupported annotation tool: ${tool}`);
        if (typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color))
            throw new TypeError('Color must use #RRGGBB notation');
        if (!Number.isFinite(width) || width <= 0)
            throw new TypeError('Stroke width must be positive');
        if (tool === Tool.OBSCURE) {
            validateObscureTreatment(obscureTreatment);
            validateObscureIntensity(obscureIntensity);
        }

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
        if (tool === Tool.OBSCURE) {
            this.#draft.obscureTreatment = obscureTreatment;
            this.#draft.obscureIntensity = obscureIntensity;
        }
        this.#draftView = draftView(this.#draft);
        this.#storedPointCount++;
        this.#touchDraft();
        return true;
    }

    appendPoint(point) {
        if (!this.#draft)
            throw new Error('No stroke is in progress');

        // Obscure is a bounded rectangle, not a sampled freehand stroke.
        // Route the public append API through the same endpoint and area
        // validation used by pointer-driven shape updates.
        if (this.#draft.tool === Tool.OBSCURE)
            return this.replaceEndPoint(point);

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
        const candidate = {
            ...this.#draft,
            points: this.#draft.points.length === 1
                ? [this.#draft.points[0], next]
                : [...this.#draft.points.slice(0, -1), next],
        };
        if (candidate.tool === Tool.OBSCURE &&
            this.#obscureArea + obscureArea(candidate) >
                this.#maxObscureArea) {
            return false;
        }

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

        const addedObscureArea = stroke.tool === Tool.OBSCURE
            ? obscureArea(stroke)
            : 0;
        if (stroke.tool === Tool.OBSCURE && addedObscureArea === 0) {
            this.#storedPointCount -= stroke.points.length;
            return false;
        }

        const committedStroke = freezeStroke(stroke);
        this.#strokes = this.#strokes.append(committedStroke);
        this.#obscureArea += addedObscureArea;
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
        if (result.stroke.tool === Tool.OBSCURE)
            this.#obscureArea -= obscureArea(result.stroke);
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
        if (stroke.tool === Tool.OBSCURE)
            this.#obscureArea += obscureArea(stroke);
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
        this.#obscureArea = 0;

        if (hadCommitted)
            this.#touchCommitted({type: CommittedChangeType.CLEAR});
        if (hadDraft)
            this.#touchDraft();
    }

    replaceLastObscure({
        start,
        end,
        obscureTreatment,
        obscureIntensity,
    } = {}) {
        if (this.#draft)
            return null;
        const previous = this.#strokes.at(-1);
        if (previous?.tool !== Tool.OBSCURE)
            return null;

        const replacement = {
            ...previous,
            points: [
                createPoint(start ?? previous.points[0]),
                createPoint(end ?? previous.points.at(-1)),
            ],
            obscureTreatment: validateObscureTreatment(
                obscureTreatment ?? previous.obscureTreatment
            ),
            obscureIntensity: validateObscureIntensity(
                obscureIntensity ?? previous.obscureIntensity
            ),
        };
        const previousArea = obscureArea(previous);
        const replacementArea = obscureArea(replacement);
        if (replacementArea === 0 ||
            this.#obscureArea - previousArea + replacementArea >
                this.#maxObscureArea) {
            return null;
        }

        this.#storedPointCount -= this.#redoPointCount;
        this.#redoPointCount = 0;
        this.#redoStrokes = [];

        const committed = freezeStroke(replacement);
        this.#strokes = this.#strokes.replaceLast(committed);
        this.#obscureArea += replacementArea - previousArea;
        this.#touchCommitted({
            type: CommittedChangeType.REPLACE,
            stroke: committed,
            previousStroke: previous,
            bounds: unionRects(
                annotationBounds(previous),
                annotationBounds(committed)
            ),
        });
        return committed;
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
