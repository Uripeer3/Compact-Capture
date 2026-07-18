// SPDX-License-Identifier: GPL-3.0-only

import GdkPixbuf from 'gi://GdkPixbuf';

import {renderAnnotationsToSvg} from '../src/core/annotationSvgRenderer.js';
import {Tool} from '../src/core/toolDefinitions.js';

const plan = Object.freeze({
    originX: 10,
    originY: 20,
    pixelWidth: 200,
    pixelHeight: 100,
    textureScale: 2,
});
const svg = renderAnnotationsToSvg([{
    tool: Tool.HIGHLIGHTER,
    color: '#f6d32d',
    width: 12,
    points: [{x: 20, y: 40}, {x: 80, y: 40}],
}], plan);
const loader = GdkPixbuf.PixbufLoader.new_with_type('svg');

loader.set_size(plan.pixelWidth, plan.pixelHeight);
loader.write(new TextEncoder().encode(svg));
loader.close();

const pixbuf = loader.get_pixbuf();
if (!pixbuf)
    throw new Error('SVG loader returned no rasterized annotation');
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

print('In-memory SVG annotation rasterization passed');
