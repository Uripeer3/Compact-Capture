// SPDX-License-Identifier: GPL-3.0-only

import Cairo from 'gi://cairo';

import {renderAnnotations} from '../core/annotationRenderer.js';

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
        this.#ensureSurface(view, scale);
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

    #ensureSurface(view, scale) {
        if (view.committedRevision === this.#committedRevision &&
            scale === this.#resourceScale) {
            return;
        }

        this.destroy();
        if (view.committed.length === 0) {
            this.#committedRevision = view.committedRevision;
            this.#resourceScale = scale;
            return;
        }

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
        try {
            const cacheCr = new Cairo.Context(surface);
            try {
                cacheCr.translate(-this.#stageRect.x, -this.#stageRect.y);
                renderAnnotations(cacheCr, view.committed);
            } finally {
                cacheCr.$dispose();
            }
            surface.flush();
        } catch (error) {
            surface.finish();
            throw error;
        }

        this.#surface = surface;
        this.#committedRevision = view.committedRevision;
        this.#resourceScale = scale;
    }
}
