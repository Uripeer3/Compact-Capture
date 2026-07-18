// SPDX-License-Identifier: GPL-3.0-only

import Cairo from 'gi://cairo';

import {
    annotationBounds,
    boundsIntersect,
} from '../core/annotationBounds.js';
import {
    renderAnnotation,
    renderAnnotations,
} from '../core/annotationRenderer.js';
import {intersectRects} from '../core/geometry.js';
import {Tool} from '../core/toolDefinitions.js';
import {
    alignRectToDevicePixels,
    CacheUpdate,
    renderCacheUpdate,
} from '../core/renderCachePlan.js';

export class AnnotationRenderCache {
    #committedRevision = -1;
    #resourceScale = 0;
    #stageRect;
    #surface = null;

    constructor(stageRect) {
        this.#stageRect = {...stageRect};
    }

    paint(cr, view, resourceScale) {
        const scale = Number.isFinite(resourceScale) && resourceScale > 0
            ? resourceScale
            : 1;
        this.#updateSurface(view, scale);
        if (!this.#surface)
            return;

        cr.setSourceSurface(this.#surface, 0, 0);
        cr.paint();
    }

    destroy() {
        this.#surface?.finish();
        this.#surface = null;
        this.#committedRevision = -1;
        this.#resourceScale = 0;
    }

    #updateSurface(view, scale) {
        let hasRenderableCommitted = false;
        for (const stroke of view.committed) {
            if (stroke.tool !== Tool.OBSCURE) {
                hasRenderableCommitted = true;
                break;
            }
        }

        // Obscure content lives in GPU preview actors, never on this Cairo
        // surface. Sequential Obscure commits, edits and history changes can
        // advance the shared document revision without dirtying drawing pixels.
        if (this.#surface && scale === this.#resourceScale &&
            view.committedRevision === this.#committedRevision + 1 &&
            view.committedChange?.stroke?.tool === Tool.OBSCURE) {
            this.#committedRevision = view.committedRevision;
            return;
        }
        const update = renderCacheUpdate({
            cachedRevision: this.#committedRevision,
            cachedScale: this.#resourceScale,
            hasSurface: this.#surface !== null,
            nextRevision: view.committedRevision,
            nextScale: scale,
            hasCommitted: hasRenderableCommitted,
            change: view.committedChange,
        });

        if (update === CacheUpdate.ALLOCATE)
            this.#replaceSurface(view.committed, scale);
        else if (update === CacheUpdate.APPEND)
            this.#drawAppend(view.committedChange.stroke);
        else if (update === CacheUpdate.DIRTY)
            this.#redrawDirty(
                view.committed,
                view.committedChange.bounds,
                scale
            );
        else if (update === CacheUpdate.CLEAR)
            this.#redrawAll([]);
        else if (update === CacheUpdate.FULL)
            this.#redrawAll(view.committed);

        this.#committedRevision = view.committedRevision;
        this.#resourceScale = scale;
    }

    #replaceSurface(strokes, scale) {
        this.#surface?.finish();
        this.#surface = null;
        if (strokes.length === 0)
            return;

        const pixelWidth = Math.max(
            1,
            Math.ceil(this.#stageRect.width * scale)
        );
        const pixelHeight = Math.max(
            1,
            Math.ceil(this.#stageRect.height * scale)
        );
        const surface = new Cairo.ImageSurface(
            Cairo.Format.ARGB32,
            pixelWidth,
            pixelHeight
        );
        surface.setDeviceScale(scale, scale);
        this.#surface = surface;
        try {
            this.#redrawAll(strokes);
        } catch (error) {
            this.#surface = null;
            surface.finish();
            throw error;
        }
    }

    #drawAppend(stroke) {
        if (!this.#surface)
            return;

        this.#withContext(cr => renderAnnotation(cr, stroke));
    }

    #redrawDirty(strokes, bounds, scale) {
        if (!this.#surface)
            return;

        const clippedBounds = intersectRects(bounds, this.#stageRect);
        if (!clippedBounds)
            return;
        const dirty = intersectRects(
            alignRectToDevicePixels(
                clippedBounds,
                scale,
                this.#stageRect
            ),
            this.#stageRect
        );

        this.#withContext(cr => {
            cr.rectangle(dirty.x, dirty.y, dirty.width, dirty.height);
            cr.clip();
            cr.setOperator(Cairo.Operator.CLEAR);
            cr.paint();
            cr.setOperator(Cairo.Operator.OVER);

            for (const stroke of strokes) {
                if (boundsIntersect(annotationBounds(stroke), dirty))
                    renderAnnotation(cr, stroke);
            }
        });
    }

    #redrawAll(strokes) {
        if (!this.#surface)
            return;

        this.#withContext(cr => {
            cr.setOperator(Cairo.Operator.CLEAR);
            cr.paint();
            cr.setOperator(Cairo.Operator.OVER);
            renderAnnotations(cr, strokes);
        });
    }

    #withContext(callback) {
        const cr = new Cairo.Context(this.#surface);
        try {
            cr.translate(-this.#stageRect.x, -this.#stageRect.y);
            callback(cr);
        } finally {
            cr.$dispose();
            this.#surface.flush();
        }
    }
}
