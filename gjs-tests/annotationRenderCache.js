// SPDX-License-Identifier: GPL-3.0-only

import Cairo from 'gi://cairo';
import Gdk from 'gi://Gdk';

import {annotationBounds} from '../src/core/annotationBounds.js';
import {
    CommittedChangeType,
} from '../src/core/annotationDocument.js';
import {renderAnnotations} from '../src/core/annotationRenderer.js';
import {Tool} from '../src/core/toolDefinitions.js';
import {AnnotationRenderCache} from '../src/ui/annotationRenderCache.js';

const STAGE_RECT = Object.freeze({x: 300, y: 40, width: 160, height: 100});

function freezeStroke(stroke) {
    Object.freeze(stroke.points);
    return Object.freeze(stroke);
}

function createSurface(scale) {
    const surface = new Cairo.ImageSurface(
        Cairo.Format.ARGB32,
        Math.ceil(STAGE_RECT.width * scale),
        Math.ceil(STAGE_RECT.height * scale)
    );
    surface.setDeviceScale(scale, scale);
    return surface;
}

function paintExpected(strokes, scale) {
    const surface = createSurface(scale);
    const cr = new Cairo.Context(surface);
    try {
        cr.translate(-STAGE_RECT.x, -STAGE_RECT.y);
        renderAnnotations(cr, strokes);
    } finally {
        cr.$dispose();
        surface.flush();
    }
    return surface;
}

function paintCache(cache, view, scale) {
    const surface = createSurface(scale);
    const cr = new Cairo.Context(surface);
    try {
        cache.paint(cr, view, scale);
    } finally {
        cr.$dispose();
        surface.flush();
    }
    return surface;
}

function surfacePixels(surface, scale) {
    const pixbuf = Gdk.pixbuf_get_from_surface(
        surface,
        0,
        0,
        Math.ceil(STAGE_RECT.width * scale),
        Math.ceil(STAGE_RECT.height * scale)
    );
    if (!pixbuf)
        throw new Error('GDK could not read the Cairo regression surface');
    return Uint8Array.from(pixbuf.read_pixel_bytes().get_data());
}

function assertPixelIdentical(actual, expected, label) {
    if (actual.length !== expected.length)
        throw new Error(`${label}: pixel buffer lengths differ`);

    let changed = 0;
    let maximumError = 0;
    for (let index = 0; index < actual.length; index++) {
        const difference = Math.abs(actual[index] - expected[index]);
        if (difference > 0) {
            changed++;
            maximumError = Math.max(maximumError, difference);
        }
    }
    if (changed > 0) {
        throw new Error(
            `${label}: ${changed} channels changed; maximum error ${
                maximumError}/255`
        );
    }
}

function runCase(scale, rectangleStartX) {
    const highlighter = freezeStroke({
        tool: Tool.HIGHLIGHTER,
        color: '#ffff00',
        width: 12,
        points: [{x: 350, y: 80}, {x: 430, y: 80}],
    });
    const removedRectangle = freezeStroke({
        tool: Tool.RECTANGLE,
        color: '#ff0000',
        width: 3,
        points: [
            {x: rectangleStartX, y: 60.25},
            {x: rectangleStartX + 20, y: 100.25},
        ],
    });
    const cache = new AnnotationRenderCache(STAGE_RECT);
    const initial = paintCache(cache, {
        committedRevision: 1,
        committedChange: null,
        committed: [highlighter, removedRectangle],
        draft: null,
    }, scale);
    const initialPixels = surfacePixels(initial, scale);
    initial.finish();

    const expected = paintExpected([highlighter], scale);
    const expectedUndoPixels = surfacePixels(expected, scale);
    expected.finish();
    try {
        for (let cycle = 0; cycle < 10; cycle++) {
            const undo = paintCache(cache, {
                committedRevision: cycle * 2 + 2,
                committedChange: {
                    type: CommittedChangeType.REMOVE,
                    stroke: removedRectangle,
                    bounds: annotationBounds(removedRectangle),
                },
                committed: [highlighter],
                draft: null,
            }, scale);
            try {
                assertPixelIdentical(
                    surfacePixels(undo, scale),
                    expectedUndoPixels,
                    `${scale}x undo cycle ${cycle + 1}`
                );
            } finally {
                undo.finish();
            }

            const redo = paintCache(cache, {
                committedRevision: cycle * 2 + 3,
                committedChange: {
                    type: CommittedChangeType.APPEND,
                    stroke: removedRectangle,
                    bounds: annotationBounds(removedRectangle),
                },
                committed: [highlighter, removedRectangle],
                draft: null,
            }, scale);
            try {
                assertPixelIdentical(
                    surfacePixels(redo, scale),
                    initialPixels,
                    `${scale}x redo cycle ${cycle + 1}`
                );
            } finally {
                redo.finish();
            }
        }
    } finally {
        cache.destroy();
    }
}

function runDiagonalHighlighterCapCase(scale) {
    const highlighter = freezeStroke({
        tool: Tool.HIGHLIGHTER,
        color: '#ffff00',
        width: 16,
        points: [{x: 350, y: 60}, {x: 390, y: 100}],
    });
    // Its dirty region begins beyond the old width / 2 + 1 bound but crosses
    // pixels covered by the diagonal square cap.
    const removedRectangle = freezeStroke({
        tool: Tool.RECTANGLE,
        color: '#ff0000',
        width: 3,
        points: [{x: 402, y: 70}, {x: 402, y: 110}],
    });
    const cache = new AnnotationRenderCache(STAGE_RECT);
    const initial = paintCache(cache, {
        committedRevision: 1,
        committedChange: null,
        committed: [highlighter, removedRectangle],
        draft: null,
    }, scale);
    initial.finish();

    const expected = paintExpected([highlighter], scale);
    const expectedPixels = surfacePixels(expected, scale);
    expected.finish();
    const undo = paintCache(cache, {
        committedRevision: 2,
        committedChange: {
            type: CommittedChangeType.REMOVE,
            stroke: removedRectangle,
            bounds: annotationBounds(removedRectangle),
        },
        committed: [highlighter],
        draft: null,
    }, scale);
    try {
        assertPixelIdentical(
            surfacePixels(undo, scale),
            expectedPixels,
            `${scale}x diagonal highlighter cap undo`
        );
    } finally {
        undo.finish();
        cache.destroy();
    }
}

runCase(1, 390);
runCase(2, 390.25);
runDiagonalHighlighterCapCase(1);
runDiagonalHighlighterCapCase(2);
print('Cairo dirty-redraw pixel parity passed at 1x and 2x');
