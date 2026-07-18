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
        for (const method of [
            'open',
            'connect',
            'disconnect',
            'add_child',
            'insert_child_below',
            'remove_child',
            'transform_stage_point',
        ]) {
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

        const primaryMonitorBin = screenshotUi._primaryMonitorBin;
        for (const method of ['add_child', 'remove_child']) {
            if (typeof primaryMonitorBin?.[method] !== 'function') {
                issues.push(
                    `Main.screenshotUI._primaryMonitorBin.${method} is unavailable`
                );
            }
        }

        const areaSelector = screenshotUi._areaSelector;
        for (const method of [
            'connect',
            'disconnect',
            'getGeometry',
            'reset',
            'set_cursor_type',
            '_updateSelectionRect',
        ]) {
            if (typeof areaSelector?.[method] !== 'function') {
                issues.push(
                    `Main.screenshotUI._areaSelector.${method} is unavailable`
                );
            }
        }

        for (const field of [
            '_startX',
            '_startY',
            '_lastX',
            '_lastY',
        ]) {
            if (!Number.isFinite(areaSelector?.[field])) {
                issues.push(
                    `Main.screenshotUI._areaSelector.${field} is unavailable`
                );
            }
        }

        const areaIndicator = areaSelector?._areaIndicator;
        if (typeof areaIndicator?.setSelectionRect !== 'function') {
            issues.push(
                'Main.screenshotUI._areaSelector._areaIndicator.setSelectionRect is unavailable'
            );
        }
        if (!Number.isFinite(areaIndicator?._selectionRect?.opacity)) {
            issues.push(
                'Main.screenshotUI._areaSelector._areaIndicator._selectionRect.opacity is unavailable'
            );
        }

        for (const field of [
            '_topLeftHandle',
            '_topRightHandle',
            '_bottomLeftHandle',
            '_bottomRightHandle',
        ]) {
            if (!Number.isFinite(areaSelector?.[field]?.opacity)) {
                issues.push(
                    `Main.screenshotUI._areaSelector.${field}.opacity is unavailable`
                );
            }
        }

        if (typeof screenshotUi._captureButton?.reactive !== 'boolean') {
            issues.push(
                'Main.screenshotUI._captureButton.reactive is unavailable'
            );
        }

        for (const field of [
            '_shotButton',
            '_selectionButton',
            '_screenButton',
            '_windowButton',
        ]) {
            const button = screenshotUi[field];
            if (typeof button?.checked !== 'boolean')
                issues.push(`Main.screenshotUI.${field}.checked is unavailable`);
            for (const method of ['connect', 'disconnect']) {
                if (typeof button?.[method] !== 'function') {
                    issues.push(
                        `Main.screenshotUI.${field}.${method} is unavailable`
                    );
                }
            }
        }

        if (!Array.isArray(screenshotUi._screenSelectors))
            issues.push('Main.screenshotUI._screenSelectors is unavailable');
    }

    return Object.freeze({
        compatible: issues.length === 0,
        shellMajor: major,
        issues: Object.freeze(issues),
    });
}
