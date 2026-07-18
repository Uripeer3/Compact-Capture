// SPDX-License-Identifier: GPL-3.0-only

import assert from 'node:assert/strict';
import test from 'node:test';

import {
    inspectScreenshotUi,
    SUPPORTED_SHELL_MAJORS,
} from '../src/shell/screenshotUiContract.js';

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
        connect() {}
        disconnect() {}
        add_child() {}
        insert_child_below() {}
        remove_child() {}
        transform_stage_point() {}
    }

    return new MockScreenshotUi();
}

test('accepts the supported GNOME Shell major version', () => {
    const result = inspectScreenshotUi('50.2', compatibleUi());

    assert.equal(result.compatible, true);
    assert.equal(result.shellMajor, 50);
    assert.deepEqual(result.issues, []);
    assert.deepEqual(SUPPORTED_SHELL_MAJORS, [50]);
});

test('fails open on unsupported and malformed versions', () => {
    const unsupported = inspectScreenshotUi('49.6', compatibleUi());
    const malformed = inspectScreenshotUi('development', compatibleUi());

    assert.equal(unsupported.compatible, false);
    assert.equal(unsupported.shellMajor, 49);
    assert.match(unsupported.issues[0], /unsupported/);
    assert.equal(malformed.compatible, false);
    assert.equal(malformed.shellMajor, null);
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
    ]);
});
