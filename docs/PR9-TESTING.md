# PR 9 manual test contract

Run the Shell-independent lifecycle tests and complete project checks first:

```sh
npm test
npm run check
```

## Initial mode and mode return

1. Open the normal screenshot UI in area mode. Confirm the native shade and
   Compact Capture hint appear without a visible default selection rectangle.
2. Open directly with GNOME's screen-recording shortcut while area mode is
   selected, then switch to screenshot mode without dragging. Confirm the
   screenshot area is empty, the hint is visible and capture remains gated.
3. Start in screenshot area mode, switch to recording and then return to
   screenshots without dragging. Confirm the empty area and hint return.
4. Open in recording area mode, drag a deliberate region and then switch to
   screenshots. Confirm that region is retained and annotation controls appear
   without asking for a second drag.

## Capture transitions

1. From an empty screenshot area, choose Screen. Confirm the hint disappears,
   the selected monitor is drawable and GNOME's screen capture remains active.
2. Return to Area. Confirm it starts empty again rather than showing GNOME's
   default rectangle as a completed selection.
3. Repeat through Window and back to Area. Window capture must remain native,
   and returning to Area must restore the empty gate.
4. Drag and resize an area normally. The first drag must retain GNOME's native
   geometry and produce one selected state with aligned annotation controls.

## Recreated screen selectors

1. Open Screen capture and choose a non-primary monitor. Confirm the toolbar
   and drawing overlay follow that monitor.
2. Close ScreenshotUI, change the monitor layout or scale so GNOME rebuilds its
   monitor actors, then reopen ScreenshotUI.
3. Choose a different non-primary screen. Confirm Compact Capture rebuilds its
   overlay for the new screen and the saved output contains its annotations.
4. Repeat close, monitor change and reopen twice. Check the user journal for
   stale-actor disconnect errors or duplicate screen-selection callbacks.

## Cleanup

1. Close ScreenshotUI from each mode and reopen it. No selection, hint or
   annotation state may leak from the previous session.
2. Disable Compact Capture while area mode is empty. GNOME's selection visuals,
   capture button and shortcuts must return to their native state.
