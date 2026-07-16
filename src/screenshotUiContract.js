// SPDX-License-Identifier: GPL-3.0-only

export const SUPPORTED_SHELL_MAJORS = Object.freeze([50]);

function shellMajor(version) {
    const match = /^(\d+)/.exec(String(version ?? ''));
    return match ? Number.parseInt(match[1], 10) : null;
}

export function inspectScreenshotUi(shellVersion, screenshotUi) {
    const issues = [];
    const major = shellMajor(shellVersion);

    if (!SUPPORTED_SHELL_MAJORS.includes(major))
        issues.push(`unsupported GNOME Shell version: ${shellVersion ?? 'unknown'}`);

    if (!screenshotUi || typeof screenshotUi !== 'object') {
        issues.push('Main.screenshotUI is unavailable');
    } else {
        for (const method of ['open', 'connect', 'disconnect']) {
            if (typeof screenshotUi[method] !== 'function')
                issues.push(`Main.screenshotUI.${method} is unavailable`);
        }

        if (typeof screenshotUi.visible !== 'boolean')
            issues.push('Main.screenshotUI.visible is unavailable');

        const prototype = Object.getPrototypeOf(screenshotUi);
        if (!prototype || !Object.hasOwn(prototype, 'open')) {
            issues.push(
                'Main.screenshotUI.open is not defined on its direct prototype'
            );
        }
    }

    return Object.freeze({
        compatible: issues.length === 0,
        shellMajor: major,
        issues: Object.freeze(issues),
    });
}
