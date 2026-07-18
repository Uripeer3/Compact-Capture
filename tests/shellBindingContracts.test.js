// SPDX-License-Identifier: GPL-3.0-only

import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

const obscureRendererUrl = new URL(
    '../src/shell/obscureRenderer.js',
    import.meta.url
);
const outputRendererUrl = new URL(
    '../src/shell/outputRenderer.js',
    import.meta.url
);

test('Clutter texture content passes the optional rectangle explicitly', async () => {
    const obscureRenderer = await readFile(obscureRendererUrl, 'utf8');
    const outputRenderer = await readFile(outputRendererUrl, 'utf8');

    assert.match(
        obscureRenderer,
        /TextureContent\.new_from_texture\(texture, null\)/
    );
    assert.doesNotMatch(
        outputRenderer,
        /TextureContent\.new_from_texture/
    );
});
