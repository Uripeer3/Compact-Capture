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

test('UI translation waits for the enabled extension instance', async () => {
    const toolbar = await readFile(
        projectFile('src/ui/compactToolbar.js'),
        'utf8'
    );
    const hint = await readFile(
        projectFile('src/ui/selectionHint.js'),
        'utf8'
    );
    const extension = await readFile(
        projectFile('src/extension.js'),
        'utf8'
    );

    for (const source of [toolbar, hint]) {
        assert.doesNotMatch(source, /gettext\s+as/);
        assert.doesNotMatch(
            source,
            /resource:\/\/\/org\/gnome\/shell\/extensions\/extension\.js/
        );
    }
    assert.match(
        extension,
        /this\._gettext = this\.gettext\.bind\(this\)/
    );
    assert.equal(
        extension.match(/gettext: this\._gettext/g)?.length,
        2
    );
});
