// SPDX-License-Identifier: GPL-3.0-only

import {performance} from 'node:perf_hooks';

import {
    AnnotationDocument,
    MAX_DOCUMENT_POINTS,
} from '../src/core/annotationDocument.js';
import {MAX_STROKE_POINTS} from '../src/core/pointSampler.js';
import {Tool} from '../src/core/toolDefinitions.js';
import {renderAnnotationsToSvg} from '../src/core/annotationSvgRenderer.js';

const document = new AnnotationDocument();
const strokeCount = MAX_DOCUMENT_POINTS / MAX_STROKE_POINTS;
const buildStarted = performance.now();

for (let stroke = 0; stroke < strokeCount; stroke++) {
    document.beginStroke({
        tool: Tool.FREEHAND,
        color: '#ed333b',
        width: 3,
        point: {x: 0, y: stroke},
    });
    for (let point = 1; point < MAX_STROKE_POINTS; point++)
        document.appendPoint({x: point, y: stroke});
    document.commitStroke();
}
const buildDuration = performance.now() - buildStarted;

const renderIterations = 100_000;
const renderStarted = performance.now();
const firstView = document.renderView();
for (let index = 0; index < renderIterations; index++) {
    if (document.renderView() !== firstView)
        throw new Error('Unchanged render views must retain object identity');
}
const renderDuration = performance.now() - renderStarted;

const snapshotStarted = performance.now();
const snapshot = document.snapshot();
const snapshotDuration = performance.now() - snapshotStarted;

const svgStarted = performance.now();
const svg = renderAnnotationsToSvg(snapshot, {
    originX: 0,
    originY: 0,
    pixelWidth: 3840,
    pixelHeight: 2160,
    textureScale: 1,
});
const svgDuration = performance.now() - svgStarted;

console.log(JSON.stringify({
    points: document.pointCount,
    strokes: document.size,
    documentBuildMilliseconds: Number(buildDuration.toFixed(3)),
    renderViewLookups: renderIterations,
    renderViewMilliseconds: Number(renderDuration.toFixed(3)),
    outputSnapshotMilliseconds: Number(snapshotDuration.toFixed(3)),
    outputSvgMilliseconds: Number(svgDuration.toFixed(3)),
    outputSvgBytes: new TextEncoder().encode(svg).length,
    outputSnapshotPoints: snapshot.reduce(
        (total, stroke) => total + stroke.points.length,
        0
    ),
}, null, 2));
