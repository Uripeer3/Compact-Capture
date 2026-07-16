// SPDX-License-Identifier: GPL-3.0-only
// Rendering behaviour adapted from Gradia Capture (GPL-3.0).

import Cairo from 'gi://cairo';

import {Tool} from './toolDefinitions.js';

function setColor(cr, color, alpha = 1) {
    const red = Number.parseInt(color.slice(1, 3), 16) / 255;
    const green = Number.parseInt(color.slice(3, 5), 16) / 255;
    const blue = Number.parseInt(color.slice(5, 7), 16) / 255;
    cr.setSourceRGBA(red, green, blue, alpha);
}

function drawPolyline(cr, points) {
    cr.moveTo(points[0].x, points[0].y);
    for (const point of points.slice(1))
        cr.lineTo(point.x, point.y);
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
    const start = stroke.points[0];
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
    const start = stroke.points[0];
    const end = stroke.points.at(-1);
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const spread = Math.PI / 7;
    const headLength = stroke.width * 5;

    setColor(cr, stroke.color);
    cr.setLineWidth(stroke.width);
    cr.setLineCap(Cairo.LineCap.ROUND);
    cr.setLineJoin(Cairo.LineJoin.ROUND);
    cr.moveTo(start.x, start.y);
    cr.lineTo(end.x, end.y);
    cr.moveTo(end.x, end.y);
    cr.lineTo(
        end.x - headLength * Math.cos(angle - spread),
        end.y - headLength * Math.sin(angle - spread)
    );
    cr.moveTo(end.x, end.y);
    cr.lineTo(
        end.x - headLength * Math.cos(angle + spread),
        end.y - headLength * Math.sin(angle + spread)
    );
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

export function renderAnnotations(cr, strokes) {
    for (const stroke of strokes) {
        if (stroke.points.length < 2)
            continue;
        DRAWERS.get(stroke.tool)?.(cr, stroke);
    }
}
