// SPDX-License-Identifier: GPL-3.0-only

export const Tool = Object.freeze({
    FREEHAND: 'freehand',
    RECTANGLE: 'rectangle',
    ARROW: 'arrow',
    HIGHLIGHTER: 'highlighter',
});

export const TOOL_DEFINITIONS = Object.freeze([
    Object.freeze({
        id: Tool.FREEHAND,
        label: 'Freehand',
        iconName: 'document-edit-symbolic',
        defaultWidth: 3,
    }),
    Object.freeze({
        id: Tool.RECTANGLE,
        label: 'Rectangle',
        iconFile: 'rectangle-symbolic.svg',
        defaultWidth: 3,
    }),
    Object.freeze({
        id: Tool.ARROW,
        label: 'Arrow',
        iconFile: 'arrow-symbolic.svg',
        defaultWidth: 3,
    }),
    Object.freeze({
        id: Tool.HIGHLIGHTER,
        label: 'Highlighter',
        iconFile: 'highlighter-symbolic.svg',
        defaultWidth: 12,
    }),
]);

export const TOOL_COLORS = Object.freeze([
    Object.freeze({name: 'White', value: '#ffffff'}),
    Object.freeze({name: 'Black', value: '#000000'}),
    Object.freeze({name: 'Red', value: '#ed333b'}),
    Object.freeze({name: 'Yellow', value: '#f6d32d'}),
    Object.freeze({name: 'Green', value: '#33d17a'}),
    Object.freeze({name: 'Blue', value: '#3584e4'}),
]);

export const LINE_WIDTH_MIN = 1;
export const LINE_WIDTH_MAX = 16;

const TOOL_IDS = new Set(TOOL_DEFINITIONS.map(tool => tool.id));

export function isSupportedTool(tool) {
    return TOOL_IDS.has(tool);
}

export function isSupportedColor(color) {
    return TOOL_COLORS.some(candidate => candidate.value === color);
}
