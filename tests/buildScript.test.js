// SPDX-License-Identifier: GPL-3.0-only

import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {
    chmod,
    mkdir,
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

test('build passes every source directory to the GNOME packer', async () => {
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
            'core',
            'icons',
            'shell',
            'ui',
        ]);
    } finally {
        await rm(temporaryDirectory, {recursive: true, force: true});
    }
});

test('build compiles and packages translation catalogs when present', async () => {
    const temporaryDirectory = await mkdtemp(
        path.join(tmpdir(), 'compact-capture-i18n-build-')
    );
    const fakePacker = path.join(temporaryDirectory, 'gnome-extensions');
    const fakeMsgfmt = path.join(temporaryDirectory, 'msgfmt');
    const capturedArguments = path.join(temporaryDirectory, 'arguments');
    const poDirectory = path.join(temporaryDirectory, 'po');

    try {
        await writeFile(fakePacker, `#!/usr/bin/env bash
printf '%s\\n' "$@" > "$CAPTURED_ARGUMENTS"
`);
        await writeFile(fakeMsgfmt, `#!/usr/bin/env bash
for argument in "$@"; do
    case "$argument" in
        --output-file=*) output="\${argument#--output-file=}" ;;
    esac
done
mkdir -p "\${output%/*}"
printf 'compiled catalog' > "$output"
`);
        await chmod(fakePacker, 0o755);
        await chmod(fakeMsgfmt, 0o755);
        await mkdir(poDirectory, {recursive: true});
        await writeFile(
            path.join(poDirectory, 'zz.po'),
            'msgid ""\nmsgstr ""\n'
        );

        await execFileAsync(path.join(projectRoot, 'build.sh'), {
            cwd: projectRoot,
            env: {
                ...process.env,
                CAPTURED_ARGUMENTS: capturedArguments,
                COMPACT_CAPTURE_PO_DIR: poDirectory,
                PATH: `${temporaryDirectory}:${process.env.PATH}`,
            },
        });

        const argumentsList = (await readFile(capturedArguments, 'utf8'))
            .trim()
            .split('\n');
        assert.ok(argumentsList.includes('--extra-source=locale'));
    } finally {
        await rm(temporaryDirectory, {recursive: true, force: true});
    }
});
