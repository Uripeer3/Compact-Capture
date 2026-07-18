// SPDX-License-Identifier: GPL-3.0-only

import assert from 'node:assert/strict';
import {readdir, readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const projectRoot = path.resolve(import.meta.dirname, '..');

async function javascriptFiles(directory) {
    const entries = await readdir(directory, {withFileTypes: true});
    const files = [];
    for (const entry of entries) {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory())
            files.push(...await javascriptFiles(entryPath));
        else if (entry.name.endsWith('.js'))
            files.push(entryPath);
    }
    return files;
}

test('Shell runtime does not import GTK libraries prohibited by review', async () => {
    const files = await javascriptFiles(path.join(projectRoot, 'src'));
    const prohibited = [
        /gi:\/\/(?:Gdk|Gtk|Adw)(?:\?|['"])/,
        /imports\.gi\.(?:Gdk|Gtk|Adw)\b/,
    ];

    for (const file of files) {
        const source = await readFile(file, 'utf8');
        for (const pattern of prohibited) {
            assert.doesNotMatch(
                source,
                pattern,
                `${path.relative(projectRoot, file)} imports a prohibited GTK library`
            );
        }
    }
});

test('release tooling owns the version without deprecated metadata', async () => {
    const packageJson = JSON.parse(await readFile(
        path.join(projectRoot, 'package.json'),
        'utf8'
    ));
    const metadata = JSON.parse(await readFile(
        path.join(projectRoot, 'src/metadata.json'),
        'utf8'
    ));

    assert.equal(packageJson.version, '0.1.0');
    assert.equal(Object.hasOwn(metadata, 'version'), false);
});

test('documentation separates current, testing and Version 0.2 material', async () => {
    const rootEntries = await readdir(path.join(projectRoot, 'docs'));

    assert.ok(rootEntries.includes('testing'));
    assert.ok(rootEntries.includes('v2'));
    assert.equal(rootEntries.some(entry => /^PR\d+-TESTING\.md$/.test(entry)), false);
    assert.equal(rootEntries.some(entry => entry.startsWith('v2_')), false);
});
