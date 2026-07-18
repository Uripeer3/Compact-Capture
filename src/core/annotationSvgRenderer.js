// SPDX-License-Identifier: GPL-3.0-only

import {arrowHeadPoints} from './annotationBounds.js';
import {Tool} from './toolDefinitions.js';

const COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

function number(value, name) {
    if (!Number.isFinite(value))
        throw new TypeError(`${name} must be finite`);
    return Object.is(value, -0) ? '0' : String(value);
}

function positiveNumber(value, name) {
    if (!Number.isFinite(value) || value <= 0)
        throw new RangeError(`${name} must be positive`);
    return String(value);
}

function color(value) {
    if (!COLOR_PATTERN.test(value))
        throw new TypeError('Annotation color must be a six-digit hex value');
    return value;
}

function pointCommand(command, point, name = 'Point') {
    return `${command} ${number(point.x, `${name} x`)} ` +
        `${number(point.y, `${name} y`)}`;
}

function pathData(points) {
    if (points.length < 2)
        return null;

    const commands = [pointCommand('M', points[0])];
    for (let index = 1; index < points.length; index++) {
        commands.push(pointCommand('L', points[index]));
    }
    return commands.join(' ');
}

function pathElement(stroke, lineCap, opacity = null) {
    const data = pathData(stroke.points);
    if (!data)
        return '';

    const opacityAttribute = opacity === null
        ? ''
        : ` stroke-opacity="${opacity}"`;
    return [
        `<path d="${data}"`,
        ' fill="none"',
        ` stroke="${color(stroke.color)}"`,
        ` stroke-width="${positiveNumber(stroke.width, 'Stroke width')}"`,
        ` stroke-linecap="${lineCap}"`,
        ' stroke-linejoin="round"',
        opacityAttribute,
        '/>',
    ].join('');
}

function rectangleElement(stroke) {
    if (stroke.points.length < 2)
        return '';

    const start = stroke.points[0];
    const end = stroke.points.at(-1);
    const x = number(Math.min(start.x, end.x), 'Rectangle x');
    const y = number(Math.min(start.y, end.y), 'Rectangle y');
    const width = number(Math.abs(end.x - start.x), 'Rectangle width');
    const height = number(Math.abs(end.y - start.y), 'Rectangle height');
    return [
        `<rect x="${x}" y="${y}" width="${width}" height="${height}"`,
        ' fill="none"',
        ` stroke="${color(stroke.color)}"`,
        ` stroke-width="${positiveNumber(stroke.width, 'Stroke width')}"`,
        '/>',
    ].join('');
}

function arrowElement(stroke) {
    if (stroke.points.length < 2)
        return '';

    const start = stroke.points[0];
    const end = stroke.points.at(-1);
    const [firstHead, secondHead] = arrowHeadPoints(stroke);
    const data = [
        pointCommand('M', start, 'Arrow start'),
        pointCommand('L', end, 'Arrow end'),
        pointCommand('M', end, 'Arrow end'),
        pointCommand('L', firstHead, 'Arrow head'),
        pointCommand('M', end, 'Arrow end'),
        pointCommand('L', secondHead, 'Arrow head'),
    ].join(' ');
    return [
        `<path d="${data}" fill="none"`,
        ` stroke="${color(stroke.color)}"`,
        ` stroke-width="${positiveNumber(stroke.width, 'Stroke width')}"`,
        ' stroke-linecap="round" stroke-linejoin="round"/>',
    ].join('');
}

function strokeElement(stroke) {
    switch (stroke.tool) {
    case Tool.FREEHAND:
        return pathElement(stroke, 'round');
    case Tool.RECTANGLE:
        return rectangleElement(stroke);
    case Tool.ARROW:
        return arrowElement(stroke);
    case Tool.HIGHLIGHTER:
        return pathElement(stroke, 'square', 0.4);
    default:
        throw new TypeError(`Unsupported annotation tool: ${stroke.tool}`);
    }
}

export function renderAnnotationsToSvg(strokes, plan) {
    const width = positiveNumber(plan.pixelWidth, 'Pixel width');
    const height = positiveNumber(plan.pixelHeight, 'Pixel height');
    const originX = number(plan.originX, 'Origin x');
    const originY = number(plan.originY, 'Origin y');
    const logicalWidth = number(
        plan.pixelWidth / plan.textureScale,
        'Logical width'
    );
    const logicalHeight = number(
        plan.pixelHeight / plan.textureScale,
        'Logical height'
    );
    const elements = strokes.map(strokeElement).filter(Boolean).join('');

    return [
        '<svg xmlns="http://www.w3.org/2000/svg"',
        ` width="${width}" height="${height}"`,
        ` viewBox="${originX} ${originY} ${logicalWidth} ${logicalHeight}">`,
        elements,
        '</svg>',
    ].join('');
}
