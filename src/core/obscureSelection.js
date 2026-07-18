// SPDX-License-Identifier: GPL-3.0-only

import {obscureRect} from './obscureDefinitions.js';

export const ObscureHandle = Object.freeze({
    TOP_LEFT: 'top-left',
    TOP_RIGHT: 'top-right',
    BOTTOM_LEFT: 'bottom-left',
    BOTTOM_RIGHT: 'bottom-right',
});

const HANDLE_ORDER = Object.freeze(Object.values(ObscureHandle));

export function obscureHandles(annotation, size = 12) {
    if (!Number.isFinite(size) || size <= 0)
        throw new RangeError('Handle size must be positive');
    const rect = obscureRect(annotation);
    const half = size / 2;
    const positions = new Map([
        [ObscureHandle.TOP_LEFT, {x: rect.x, y: rect.y}],
        [ObscureHandle.TOP_RIGHT, {x: rect.x + rect.width, y: rect.y}],
        [ObscureHandle.BOTTOM_LEFT, {x: rect.x, y: rect.y + rect.height}],
        [ObscureHandle.BOTTOM_RIGHT, {
            x: rect.x + rect.width,
            y: rect.y + rect.height,
        }],
    ]);
    return Object.freeze(HANDLE_ORDER.map(handle => {
        const position = positions.get(handle);
        return Object.freeze({
            handle,
            x: position.x - half,
            y: position.y - half,
            width: size,
            height: size,
        });
    }));
}

export function hitTestObscureHandle(annotation, point, size = 12) {
    if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y))
        throw new TypeError('Hit-test point must be finite');
    return obscureHandles(annotation, size).find(rect =>
        point.x >= rect.x && point.x <= rect.x + rect.width &&
        point.y >= rect.y && point.y <= rect.y + rect.height
    )?.handle ?? null;
}

export function resizeObscureFromHandle(annotation, handle, point) {
    if (!HANDLE_ORDER.includes(handle))
        throw new TypeError(`Unsupported obscure handle: ${handle}`);
    if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y))
        throw new TypeError('Resize point must be finite');

    const rect = obscureRect(annotation);
    const left = rect.x;
    const top = rect.y;
    const right = rect.x + rect.width;
    const bottom = rect.y + rect.height;
    const anchors = new Map([
        [ObscureHandle.TOP_LEFT, {x: right, y: bottom}],
        [ObscureHandle.TOP_RIGHT, {x: left, y: bottom}],
        [ObscureHandle.BOTTOM_LEFT, {x: right, y: top}],
        [ObscureHandle.BOTTOM_RIGHT, {x: left, y: top}],
    ]);
    return Object.freeze({
        start: Object.freeze(anchors.get(handle)),
        end: Object.freeze({x: point.x, y: point.y}),
    });
}
