# Version 0.1 design contract

Compact Capture preserves GNOME Shell's native screenshot interface and adds
only the annotation toolbar and its behavior. KDE Spectacle informs the compact
annotation workflow, while GNOME continues to define the surrounding visual
language, capture controls and interaction model.

## Workflow

1. Opening area capture starts without a preselected rectangle.
2. GNOME's shade remains visible and a short hint offers area, screen and
   window keyboard routes.
3. Compact Capture stays hidden while the user creates or resizes an area.
4. After selection, the annotation toolbar appears above or below the selected
   output and falls back to the top of its monitor when necessary.
5. GNOME's capture modes, pointer control, recording control and capture action
   remain visible and native.
6. Previewed annotations must appear identically in copied and saved output.

## Toolbar

The toolbar contains, in order:

- freehand, rectangle, arrow, highlighter and Obscure tools;
- the colour palette;
- line width or effect intensity for the selected tool;
- undo, redo and clear actions;
- an Obscure treatment control when that tool is active.

Use 16-pixel symbolic artwork inside compact focusable buttons. Every icon-only
control requires an accessible name and a delayed hover hint. Selected, hover,
active, insensitive and keyboard-focus states must remain distinct using Shell
theme colours rather than fixed panel colours.

## Pixelate and blur

Pixelate and Blur are treatments of one Obscure tool rather than separate
top-level tools. Pixelate is the default because its effect is immediately
recognisable. The user drags a rectangle and can adjust its bounds and effect
intensity before capture.

Both treatments must be bounded to the affected region during preview and final
rendering. The toolbar and documentation must not describe either treatment as
secure redaction; source pixels may remain recoverable in other workflows or
file histories.

## Keyboard and accessibility

- `Tab` and `Shift+Tab` move between focusable controls.
- `Enter` and `Space` activate the focused control.
- `Ctrl+Z` undoes the most recent committed stroke.
- `Ctrl+Shift+Z` and `Ctrl+Y` redo it.
- `Esc` remains owned by GNOME's screenshot interface.
- `Ctrl+C` remains GNOME's final copy path and includes annotations.

The design must remain usable at 200% scaling and on narrow selections. The
toolbar must never obscure native selection handles or become part of the saved
image.

## Version 0.1 scope

Included tools are freehand, rectangle, arrow, highlighter, pixelate and blur.
Undo, redo, clear, clipboard output and saved output are release requirements.

Text, numbered markers, selecting or moving existing annotations, window
annotations, OCR, custom save flows and external export integrations are
explicitly deferred.
