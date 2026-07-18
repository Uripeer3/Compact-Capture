// SPDX-License-Identifier: GPL-3.0-only

export const SHELL_VERSION_FIXTURES = Object.freeze({
    supported: Object.freeze([
        Object.freeze({name: 'GNOME 50 release', version: '50', major: 50}),
        Object.freeze({name: 'GNOME 50 point release', version: '50.3', major: 50}),
        Object.freeze({name: 'GNOME 50 prerelease', version: '50.beta', major: 50}),
    ]),
    unsupported: Object.freeze([
        Object.freeze({name: 'previous major', version: '49.6', major: 49}),
        Object.freeze({name: 'future major', version: '51.alpha', major: 51}),
        Object.freeze({name: 'development label', version: 'development', major: null}),
        Object.freeze({name: 'missing version', version: null, major: null}),
        Object.freeze({name: 'empty version', version: '', major: null}),
    ]),
});
