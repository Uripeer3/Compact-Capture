// SPDX-License-Identifier: GPL-3.0-only

export const DEFAULT_SAMPLE_DISTANCE = 2;
export const MAX_STROKE_POINTS = 4096;

export function squaredDistance(first, second) {
    if (![first?.x, first?.y, second?.x, second?.y].every(Number.isFinite))
        throw new TypeError('Sample points must contain finite coordinates');

    const dx = second.x - first.x;
    const dy = second.y - first.y;
    return dx * dx + dy * dy;
}

export function shouldSamplePoint(
    previous,
    next,
    minimumDistance = DEFAULT_SAMPLE_DISTANCE
) {
    if (!Number.isFinite(minimumDistance) || minimumDistance < 0)
        throw new RangeError('Minimum sample distance cannot be negative');

    return squaredDistance(previous, next) >= minimumDistance ** 2;
}
