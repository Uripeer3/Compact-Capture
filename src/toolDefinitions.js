// SPDX-License-Identifier: GPL-3.0-only

export const Tool = Object.freeze({
    FREEHAND: 'freehand',
    RECTANGLE: 'rectangle',
    ARROW: 'arrow',
    HIGHLIGHTER: 'highlighter',
});

export const TOOL_DEFINITIONS = Object.freeze([
    Object.freeze({id: Tool.FREEHAND, label: 'Freehand', defaultWidth: 3}),
    Object.freeze({id: Tool.RECTANGLE, label: 'Rectangle', defaultWidth: 3}),
    Object.freeze({id: Tool.ARROW, label: 'Arrow', defaultWidth: 3}),
    Object.freeze({id: Tool.HIGHLIGHTER, label: 'Highlighter', defaultWidth: 12}),
]);

const TOOL_IDS = new Set(TOOL_DEFINITIONS.map(tool => tool.id));

export function isSupportedTool(tool) {
    return TOOL_IDS.has(tool);
}

