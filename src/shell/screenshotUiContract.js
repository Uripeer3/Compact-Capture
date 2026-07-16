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

        const toolbarHost = screenshotUi._primaryMonitorBin;
        for (const method of ['add_child', 'remove_child']) {
            if (typeof toolbarHost?.[method] !== 'function') {
                issues.push(
                    `Main.screenshotUI._primaryMonitorBin.${method} is unavailable`
                );
            }
        }

        const shotButton = screenshotUi._shotButton;
        if (typeof shotButton?.checked !== 'boolean')
            issues.push('Main.screenshotUI._shotButton.checked is unavailable');
        for (const method of ['connect', 'disconnect']) {
            if (typeof shotButton?.[method] !== 'function') {
                issues.push(
                    `Main.screenshotUI._shotButton.${method} is unavailable`
                );
            }
        }
    }

    return Object.freeze({
        compatible: issues.length === 0,
        shellMajor: major,
        issues: Object.freeze(issues),
    });
}
