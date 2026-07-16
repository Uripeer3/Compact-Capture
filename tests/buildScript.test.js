// SPDX-License-Identifier: GPL-3.0-only

import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {
    chmod,
    mkdtemp,
    readFile,
    rm,
    writeFile,
} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {promisify} from 'node:util';
import test from 'node:test';

const execFileAsync = promisify(execFile);
const projectRoot = path.resolve(import.meta.dirname, '..');

test('build passes every imported module to the GNOME packer', async () => {
    const temporaryDirectory = await mkdtemp(
        path.join(tmpdir(), 'compact-capture-build-')
    );
    const fakePacker = path.join(temporaryDirectory, 'gnome-extensions');
    const capturedArguments = path.join(temporaryDirectory, 'arguments');

    try {
        await writeFile(fakePacker, `#!/usr/bin/env bash
printf '%s\\n' "$@" > "$CAPTURED_ARGUMENTS"
`);
        await chmod(fakePacker, 0o755);

        await execFileAsync(path.join(projectRoot, 'build.sh'), {
            cwd: projectRoot,
            env: {
                ...process.env,
                CAPTURED_ARGUMENTS: capturedArguments,
                PATH: `${temporaryDirectory}:${process.env.PATH}`,
            },
        });

        const argumentsList = (await readFile(capturedArguments, 'utf8'))
            .trim()
            .split('\n');
        const extraSources = argumentsList
            .filter(argument => argument.startsWith('--extra-source='))
            .map(argument => argument.slice('--extra-source='.length));

        assert.deepEqual(extraSources.sort(), [
            'ATTRIBUTION.md',
            'LICENSE',
            'annotationDocument.js',
            'annotationRenderer.js',
            'compactToolbar.js',
            'compactTooltip.js',
            'screenshotUiContract.js',
            'shellAdapter.js',
            'toolDefinitions.js',
            'toolbarState.js',
        ]);
    } finally {
        await rm(temporaryDirectory, {recursive: true, force: true});
    }
});
