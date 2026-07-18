// SPDX-License-Identifier: GPL-3.0-only

import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

import {
    TOOL_COLORS,
    TOOL_DEFINITIONS,
} from '../src/core/toolDefinitions.js';

const projectFile = path => new URL(`../${path}`, import.meta.url);

test('metadata initializes the Compact Capture gettext domain', async () => {
    const metadata = JSON.parse(await readFile(
        projectFile('src/metadata.json'),
        'utf8'
    ));

    assert.equal(metadata['gettext-domain'], 'compact-capture');
});

test('translation template contains every current user-facing message', async () => {
    const pot = await readFile(
        projectFile('po/compact-capture.pot'),
        'utf8'
    );
    const messages = [
        'Compact Capture',
        "Adds a compact annotation workflow to GNOME's built-in screenshot interface.",
        'Annotation tools',
        ...TOOL_DEFINITIONS.map(tool => tool.label),
        ...TOOL_COLORS.map(color => color.name),
        '%s color',
        'Line width',
        'Undo',
        'Redo',
        'Clear all annotations',
        'Drag to select an area, or press C then Enter for full screen',
    ];

    for (const message of messages) {
        assert.ok(
            pot.includes(`msgid ${JSON.stringify(message)}`),
            `missing gettext message: ${message}`
        );
    }
});
