// SPDX-License-Identifier: GPL-3.0-only

import GdkPixbuf from 'gi://GdkPixbuf';
import GLib from 'gi://GLib';

import {renderAnnotationsToSvg} from '../src/core/annotationSvgRenderer.js';
import {Tool} from '../src/core/toolDefinitions.js';

function rasterize(strokes, plan) {
    const svg = renderAnnotationsToSvg(strokes, plan);
    const loader = GdkPixbuf.PixbufLoader.new_with_type('svg');

    loader.set_size(plan.pixelWidth, plan.pixelHeight);
    loader.write(new TextEncoder().encode(svg));
    loader.close();
    const pixbuf = loader.get_pixbuf();
    if (!pixbuf)
        throw new Error('SVG loader returned no rasterized annotation');
    return pixbuf;
}

const plan = Object.freeze({
    originX: 10,
    originY: 20,
    pixelWidth: 200,
    pixelHeight: 100,
    textureScale: 2,
});
const highlighter = {
    tool: Tool.HIGHLIGHTER,
    color: '#f6d32d',
    width: 12,
    points: [{x: 20, y: 40}, {x: 80, y: 40}],
};
const pixbuf = rasterize([highlighter], plan);
if (pixbuf.width !== plan.pixelWidth || pixbuf.height !== plan.pixelHeight)
    throw new Error('SVG loader returned incorrect output dimensions');
if (!pixbuf.get_has_alpha() || pixbuf.get_n_channels() !== 4)
    throw new Error('SVG loader did not preserve transparent RGBA output');

const pixels = pixbuf.read_pixel_bytes().get_data();
const alphaAt = (x, y) => pixels[y * pixbuf.rowstride + x * 4 + 3];
if (alphaAt(0, 0) !== 0)
    throw new Error('SVG loader returned an opaque background');
const highlighterAlpha = alphaAt(40, 40);
if (highlighterAlpha < 95 || highlighterAlpha > 110)
    throw new Error(`Highlighter alpha was ${highlighterAlpha}, expected 40%`);

const fourKPlan = Object.freeze({
    originX: 0,
    originY: 0,
    pixelWidth: 3840,
    pixelHeight: 2160,
    textureScale: 1,
});
const started = GLib.get_monotonic_time();
const fourK = rasterize([{
    ...highlighter,
    points: [{x: 100, y: 100}, {x: 3700, y: 2000}],
}], fourKPlan);
const durationMilliseconds =
    (GLib.get_monotonic_time() - started) / 1000;
if (fourK.width !== 3840 || fourK.height !== 2160 ||
    !fourK.get_has_alpha() || fourK.get_n_channels() !== 4) {
    throw new Error('4K SVG rasterization returned an invalid RGBA surface');
}

print(
    'In-memory SVG annotation rasterization passed; ' +
    `4K rasterization took ${durationMilliseconds.toFixed(1)} ms`
);
