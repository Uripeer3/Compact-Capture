// SPDX-License-Identifier: GPL-3.0-only

import assert from 'node:assert/strict';
import test from 'node:test';

import {
    inspectScreenshotUi,
    SUPPORTED_SHELL_MAJORS,
} from '../src/shell/screenshotUiContract.js';
import {SHELL_VERSION_FIXTURES} from './fixtures/shellVersions.js';

function compatibleUi() {
    class MockActor {
        add_child() {}
        remove_child() {}
        transform_stage_point() {}
    }

    class MockToggle {
        checked = true;

        connect() {}
        disconnect() {}
    }

    class MockScreenshotUi {
        visible = false;
        _primaryMonitorBin = new MockActor();
        _shotButton = new MockToggle();
        _selectionButton = new MockToggle();
        _screenButton = new MockToggle();
        _windowButton = new MockToggle();
        _captureButton = {reactive: true};
        _screenSelectors = [new MockToggle()];
        _cursor = {
            content: null,
            visible: false,
            opacity: 255,
            x: 0,
            y: 0,
            set_content() {},
            set_position() {},
        };
        _cursorScale = 1;
        _areaSelector = {
            _startX: 0,
            _startY: 0,
            _lastX: 10,
            _lastY: 10,
            _areaIndicator: {
                _selectionRect: {opacity: 255},
                setSelectionRect() {},
            },
            _topLeftHandle: {opacity: 255},
            _topRightHandle: {opacity: 255},
            _bottomLeftHandle: {opacity: 255},
            _bottomRightHandle: {opacity: 255},
            connect() {},
            disconnect() {},
            getGeometry() {},
            reset() {},
            set_cursor_type() {},
            _updateSelectionRect() {},
        };

        open() {}
        _saveScreenshot() {}
        connect() {}
        disconnect() {}
        add_child() {}
        insert_child_below() {}
        remove_child() {}
        transform_stage_point() {}
    }

    return new MockScreenshotUi();
}

test('accepts every explicit supported-version fixture', () => {
    for (const fixture of SHELL_VERSION_FIXTURES.supported) {
        const result = inspectScreenshotUi(fixture.version, compatibleUi());

        assert.equal(result.compatible, true, fixture.name);
        assert.equal(result.shellMajor, fixture.major, fixture.name);
        assert.deepEqual(result.issues, [], fixture.name);
    }
    assert.deepEqual(SUPPORTED_SHELL_MAJORS, [50]);
});

test('fails open for every unsupported or malformed version fixture', () => {
    for (const fixture of SHELL_VERSION_FIXTURES.unsupported) {
        const result = inspectScreenshotUi(fixture.version, compatibleUi());

        assert.equal(result.compatible, false, fixture.name);
        assert.equal(result.shellMajor, fixture.major, fixture.name);
        assert.match(result.issues[0], /unsupported/, fixture.name);
    }
});

test('metadata advertises exactly the runtime-gated Shell majors', async () => {
    const {readFile} = await import('node:fs/promises');
    const metadata = JSON.parse(await readFile(
        new URL('../src/metadata.json', import.meta.url),
        'utf8'
    ));
    const advertisedMajors = metadata['shell-version'].map(version =>
        Number.parseInt(version, 10)
    );

    assert.deepEqual(advertisedMajors, SUPPORTED_SHELL_MAJORS);
});

test('reports a missing ScreenshotUI object', () => {
    const result = inspectScreenshotUi('50', null);

    assert.equal(result.compatible, false);
    assert.deepEqual(result.issues, ['Main.screenshotUI is unavailable']);
});

test('reports every missing contract member instead of failing at first use', () => {
    const result = inspectScreenshotUi('50', {open() {}});

    assert.equal(result.compatible, false);
    assert.deepEqual(result.issues, [
        'Main.screenshotUI.connect is unavailable',
        'Main.screenshotUI.disconnect is unavailable',
        'Main.screenshotUI.add_child is unavailable',
        'Main.screenshotUI.insert_child_below is unavailable',
        'Main.screenshotUI.remove_child is unavailable',
        'Main.screenshotUI.transform_stage_point is unavailable',
        'Main.screenshotUI.visible is unavailable',
        'Main.screenshotUI.open is not defined on its direct prototype',
        'Main.screenshotUI._saveScreenshot is not defined on its direct prototype',
        'Main.screenshotUI._primaryMonitorBin.add_child is unavailable',
        'Main.screenshotUI._primaryMonitorBin.remove_child is unavailable',
        'Main.screenshotUI._areaSelector.connect is unavailable',
        'Main.screenshotUI._areaSelector.disconnect is unavailable',
        'Main.screenshotUI._areaSelector.getGeometry is unavailable',
        'Main.screenshotUI._areaSelector.reset is unavailable',
        'Main.screenshotUI._areaSelector.set_cursor_type is unavailable',
        'Main.screenshotUI._areaSelector._updateSelectionRect is unavailable',
        'Main.screenshotUI._areaSelector._startX is unavailable',
        'Main.screenshotUI._areaSelector._startY is unavailable',
        'Main.screenshotUI._areaSelector._lastX is unavailable',
        'Main.screenshotUI._areaSelector._lastY is unavailable',
        'Main.screenshotUI._areaSelector._areaIndicator.setSelectionRect is unavailable',
        'Main.screenshotUI._areaSelector._areaIndicator._selectionRect.opacity is unavailable',
        'Main.screenshotUI._areaSelector._topLeftHandle.opacity is unavailable',
        'Main.screenshotUI._areaSelector._topRightHandle.opacity is unavailable',
        'Main.screenshotUI._areaSelector._bottomLeftHandle.opacity is unavailable',
        'Main.screenshotUI._areaSelector._bottomRightHandle.opacity is unavailable',
        'Main.screenshotUI._captureButton.reactive is unavailable',
        'Main.screenshotUI._shotButton.checked is unavailable',
        'Main.screenshotUI._shotButton.connect is unavailable',
        'Main.screenshotUI._shotButton.disconnect is unavailable',
        'Main.screenshotUI._selectionButton.checked is unavailable',
        'Main.screenshotUI._selectionButton.connect is unavailable',
        'Main.screenshotUI._selectionButton.disconnect is unavailable',
        'Main.screenshotUI._screenButton.checked is unavailable',
        'Main.screenshotUI._screenButton.connect is unavailable',
        'Main.screenshotUI._screenButton.disconnect is unavailable',
        'Main.screenshotUI._windowButton.checked is unavailable',
        'Main.screenshotUI._windowButton.connect is unavailable',
        'Main.screenshotUI._windowButton.disconnect is unavailable',
        'Main.screenshotUI._screenSelectors is unavailable',
        'Main.screenshotUI._cursor.set_content is unavailable',
        'Main.screenshotUI._cursor.set_position is unavailable',
        'Main.screenshotUI._cursor.visible is unavailable',
        'Main.screenshotUI._cursor.x is unavailable',
        'Main.screenshotUI._cursor.y is unavailable',
        'Main.screenshotUI._cursor.opacity is unavailable',
    ]);
});
