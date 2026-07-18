// SPDX-License-Identifier: GPL-3.0-only

function finiteNumber(value, name) {
    if (!Number.isFinite(value))
        throw new TypeError(`${name} must be finite`);
    return value;
}

export function normalizeRect(rect) {
    const x = finiteNumber(rect?.x, 'Rectangle x');
    const y = finiteNumber(rect?.y, 'Rectangle y');
    const width = finiteNumber(rect?.width, 'Rectangle width');
    const height = finiteNumber(rect?.height, 'Rectangle height');

    if (width < 0 || height < 0)
        throw new RangeError('Rectangle dimensions cannot be negative');

    return Object.freeze({x, y, width, height});
}

export function intersectRects(first, second) {
    const a = normalizeRect(first);
    const b = normalizeRect(second);
    const x = Math.max(a.x, b.x);
    const y = Math.max(a.y, b.y);
    const right = Math.min(a.x + a.width, b.x + b.width);
    const bottom = Math.min(a.y + a.height, b.y + b.height);

    if (right <= x || bottom <= y)
        return null;

    return Object.freeze({x, y, width: right - x, height: bottom - y});
}

export function monitorForRect(monitors, rect) {
    const selection = normalizeRect(rect);
    let bestMonitor = null;
    let bestArea = -1;

    for (const monitor of monitors) {
        const intersection = intersectRects(selection, monitor);
        const area = intersection
            ? intersection.width * intersection.height
            : 0;
        if (area > bestArea) {
            bestMonitor = monitor;
            bestArea = area;
        }
    }

    return bestArea > 0 ? bestMonitor : null;
}

export function drawingRects(selection, monitors, gutter = 8) {
    if (!Number.isFinite(gutter) || gutter < 0)
        throw new RangeError('Drawing gutter cannot be negative');

    const selectedRect = normalizeRect(selection);
    return monitors.flatMap(monitor => {
        const intersection = intersectRects(selectedRect, monitor);
        if (!intersection)
            return [];

        const left = intersection.x === selectedRect.x ? gutter : 0;
        const top = intersection.y === selectedRect.y ? gutter : 0;
        const right = intersection.x + intersection.width ===
            selectedRect.x + selectedRect.width
            ? gutter
            : 0;
        const bottom = intersection.y + intersection.height ===
            selectedRect.y + selectedRect.height
            ? gutter
            : 0;
        const width = intersection.width - left - right;
        const height = intersection.height - top - bottom;
        if (width <= 0 || height <= 0)
            return [];

        return [Object.freeze({
            monitorIndex: monitor.index,
            x: intersection.x + left,
            y: intersection.y + top,
            width,
            height,
        })];
    });
}

function clamp(value, minimum, maximum) {
    return Math.min(Math.max(value, minimum), maximum);
}

function fallbackCoordinate(start, size, itemSize, margin) {
    const availableSize = size - margin * 2;
    if (itemSize > availableSize)
        return start + (size - itemSize) / 2;

    return start + margin;
}

export function placeToolbar({
    selection,
    monitor,
    toolbar,
    gap = 8,
    margin = 12,
}) {
    const monitorRect = normalizeRect(monitor);
    const selectedRect = intersectRects(selection, monitorRect) ?? monitorRect;
    const toolbarRect = normalizeRect({x: 0, y: 0, ...toolbar});

    const centeredX = selectedRect.x +
        (selectedRect.width - toolbarRect.width) / 2;
    const availableWidth = monitorRect.width - margin * 2;
    const x = toolbarRect.width > availableWidth
        ? monitorRect.x + (monitorRect.width - toolbarRect.width) / 2
        : clamp(
            centeredX,
            monitorRect.x + margin,
            monitorRect.x + monitorRect.width - margin - toolbarRect.width
        );

    const above = selectedRect.y - gap - toolbarRect.height;
    const below = selectedRect.y + selectedRect.height + gap;
    const minimumY = fallbackCoordinate(
        monitorRect.y,
        monitorRect.height,
        toolbarRect.height,
        margin
    );
    const maximumY = monitorRect.y + monitorRect.height - margin;
    let y = minimumY;

    if (above >= minimumY)
        y = above;
    else if (below + toolbarRect.height <= maximumY)
        y = below;

    return Object.freeze({monitorIndex: monitor.index, x, y});
}
