# PR 4 manual test plan

PR 4 makes annotations visible and editable in the screenshot overlay. It does
not yet include them in the saved PNG or clipboard image; that is PR 5.

## Core workflow

1. Install the branch build and restart GNOME Shell as required by the session.
2. Enable Compact Capture and open GNOME's screenshot interface.
3. In Selection mode, confirm the desktop is dimmed, there is no initial
   rectangle, the annotation toolbar is hidden, and the selection/full-screen
   hint is visible.
4. Confirm Enter, Space and Ctrl+C do not capture an invisible default area.
5. Drag a new area. Confirm the hint disappears, the native rectangle follows
   the pointer, and the toolbar appears above or below it. Confirm that each
   tool draws a live preview inside the area.
6. Confirm Undo removes the most recent completed stroke and Clear removes all
   completed strokes.
7. Drag a native selection edge. Confirm the toolbar and drawings disappear
   during adjustment and return for the new geometry.
8. Return to empty Selection mode, press C and then Enter, and confirm GNOME
   captures the selected full screen normally.
9. Switch to Screen mode. Confirm the chosen monitor is drawable and selecting
   another monitor moves the toolbar and clears the previous annotation state.
10. Switch to Window or recording mode. Confirm Compact Capture hides and GNOME's
   native controls continue to work.

## Cleanup and compatibility

- Close and reopen the screenshot interface; old annotations must not return.
- Disable the extension while the screenshot interface is open; no toolbar or
  drawing surface should remain.
- If available, repeat on a secondary monitor and a mixed-scale display pair.
- Save a screenshot with and without preview annotations. Both should still use
  GNOME's unchanged output path, and the PR 4 preview should not be saved yet.
