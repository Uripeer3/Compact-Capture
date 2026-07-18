// SPDX-License-Identifier: GPL-3.0-only

export const ObscureTreatment = Object.freeze({
    PIXELATE: 'pixelate',
    BLUR: 'blur',
});

export const DEFAULT_OBSCURE_TREATMENT = ObscureTreatment.PIXELATE;
export const OBSCURE_INTENSITY_MIN = 4;
export const OBSCURE_INTENSITY_MAX = 24;
export const DEFAULT_OBSCURE_INTENSITY = 10;
export const MAX_OBSCURE_LOGICAL_AREA = 8_388_608;

const TREATMENTS = new Set(Object.values(ObscureTreatment));

export function isSupportedObscureTreatment(treatment) {
    return TREATMENTS.has(treatment);
}

export function validateObscureTreatment(treatment) {
    if (!isSupportedObscureTreatment(treatment))
        throw new TypeError(`Unsupported obscure treatment: ${treatment}`);
    return treatment;
}

export function validateObscureIntensity(intensity) {
    if (!Number.isFinite(intensity) ||
        intensity < OBSCURE_INTENSITY_MIN ||
        intensity > OBSCURE_INTENSITY_MAX) {
        throw new RangeError(
            `Obscure intensity must be between ${
                OBSCURE_INTENSITY_MIN} and ${OBSCURE_INTENSITY_MAX}`
        );
    }
    return intensity;
}

export function obscureRect(annotation) {
    if (!annotation?.points || annotation.points.length < 2)
        throw new TypeError('An obscure annotation requires two points');

    const start = annotation.points.at(0);
    const end = annotation.points.at(-1);
    if (![start?.x, start?.y, end?.x, end?.y].every(Number.isFinite))
        throw new TypeError('Obscure coordinates must be finite');

    return Object.freeze({
        x: Math.min(start.x, end.x),
        y: Math.min(start.y, end.y),
        width: Math.abs(end.x - start.x),
        height: Math.abs(end.y - start.y),
    });
}

export function obscureArea(annotation) {
    if (!annotation?.points || annotation.points.length < 2)
        return 0;
    const rect = obscureRect(annotation);
    return rect.width * rect.height;
}
