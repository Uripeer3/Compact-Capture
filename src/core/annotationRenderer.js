// SPDX-License-Identifier: GPL-3.0-only
// Rendering behaviour adapted from Gradia Capture (GPL-3.0).

import Cairo from 'gi://cairo';

import {arrowHeadPoints} from './annotationBounds.js';
import {Tool} from './toolDefinitions.js';

function setColor(cr, color, alpha = 1) {
    const red = Number.parseInt(color.slice(1, 3), 16) / 255;
    const green = Number.parseInt(color.slice(3, 5), 16) / 255;
    const blue = Number.parseInt(color.slice(5, 7), 16) / 255;
    cr.setSourceRGBA(red, green, blue, alpha);
}

function drawPolyline(cr, points) {
    const first = points.at(0);
    cr.moveTo(first.x, first.y);
    for (let index = 1; index < points.length; index++) {
        const point = points.at(index);
        cr.lineTo(point.x, point.y);
    }
}

function drawFreehand(cr, stroke) {
    setColor(cr, stroke.color);
    cr.setLineWidth(stroke.width);
    cr.setLineCap(Cairo.LineCap.ROUND);
    cr.setLineJoin(Cairo.LineJoin.ROUND);
    drawPolyline(cr, stroke.points);
    cr.stroke();
}

function drawRectangle(cr, stroke) {
    const start = stroke.points.at(0);
    const end = stroke.points.at(-1);
    setColor(cr, stroke.color);
    cr.setLineWidth(stroke.width);
    cr.rectangle(
        Math.min(start.x, end.x),
        Math.min(start.y, end.y),
        Math.abs(end.x - start.x),
        Math.abs(end.y - start.y)
    );
    cr.stroke();
}

function drawArrow(cr, stroke) {
    const start = stroke.points.at(0);
    const end = stroke.points.at(-1);
    const [firstHead, secondHead] = arrowHeadPoints(stroke);

    setColor(cr, stroke.color);
    cr.setLineWidth(stroke.width);
    cr.setLineCap(Cairo.LineCap.ROUND);
    cr.setLineJoin(Cairo.LineJoin.ROUND);
    cr.moveTo(start.x, start.y);
    cr.lineTo(end.x, end.y);
    cr.moveTo(end.x, end.y);
    cr.lineTo(firstHead.x, firstHead.y);
    cr.moveTo(end.x, end.y);
    cr.lineTo(secondHead.x, secondHead.y);
    cr.stroke();
}

function drawHighlighter(cr, stroke) {
    setColor(cr, stroke.color, 0.4);
    cr.setLineWidth(stroke.width);
    cr.setLineCap(Cairo.LineCap.SQUARE);
    drawPolyline(cr, stroke.points);
    cr.stroke();
}

const DRAWERS = new Map([
    [Tool.FREEHAND, drawFreehand],
    [Tool.RECTANGLE, drawRectangle],
    [Tool.ARROW, drawArrow],
    [Tool.HIGHLIGHTER, drawHighlighter],
]);

export function renderAnnotation(cr, stroke) {
    if (stroke.points.length < 2)
        return;
    DRAWERS.get(stroke.tool)?.(cr, stroke);
}

export function renderAnnotations(cr, strokes) {
    for (const stroke of strokes)
        renderAnnotation(cr, stroke);
}
