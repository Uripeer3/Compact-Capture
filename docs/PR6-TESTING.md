# PR 6 manual testing

Run these checks in a real GNOME 50 Wayland session after `npm test`,
`npm run check` and a fresh extension installation.

## History controls

1. Draw two visibly different annotations.
2. Click Undo twice and confirm they disappear in reverse order.
3. Click Redo twice and confirm both return in their original order.
4. Undo once, draw a new annotation and confirm Redo becomes insensitive.
5. Clear all annotations and confirm Undo, Redo and Clear are insensitive.

## Keyboard

1. Draw two annotations and press `Ctrl+Z`, then `Ctrl+Shift+Z`.
2. Repeat redo with `Ctrl+Y`.
3. Begin a long stroke, press `Esc` before releasing the pointer and confirm the
   draft disappears without removing the preceding committed stroke.
4. With no gesture active, press `Esc` and confirm GNOME closes its screenshot
   interface normally.
5. Confirm GNOME's area, screen, window, capture and copy shortcuts still work.

## Lifecycle and output

1. Close and reopen ScreenshotUI; confirm history starts empty.
2. Switch between area, screen and recording modes; confirm no stale history or
   enabled action buttons remain.
3. Disable Compact Capture while the UI is open and confirm GNOME capture still
   works without shortcut interception.
4. Confirm undo/redo results are identical in preview, clipboard output and the
   saved PNG.
5. Check the journal for new `JS ERROR` or `Compact Capture` failures.
