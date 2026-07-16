# PR 4 manual test plan

PR 4 makes annotations visible and editable in the screenshot overlay. It does
not yet include them in the saved PNG or clipboard image; that is PR 5.

## Core workflow

1. Install the branch build and restart GNOME Shell as required by the session.
2. Enable Compact Capture and open GNOME's screenshot interface.
3. In Selection mode, confirm the annotation toolbar is initially hidden.
4. Drag a new area. Confirm the toolbar appears above or below it and that each
   tool draws a live preview inside the area.
5. Confirm Undo removes the most recent completed stroke and Clear removes all
   completed strokes.
6. Drag a native selection edge. Confirm the toolbar and drawings disappear
   during adjustment and return for the new geometry.
7. Switch to Screen mode. Confirm the chosen monitor is drawable and selecting
   another monitor moves the toolbar and clears the previous annotation state.
8. Switch to Window or recording mode. Confirm Compact Capture hides and GNOME's
   native controls continue to work.

## Cleanup and compatibility

- Close and reopen the screenshot interface; old annotations must not return.
- Disable the extension while the screenshot interface is open; no toolbar or
  drawing surface should remain.
- If available, repeat on a secondary monitor and a mixed-scale display pair.
- Save a screenshot with and without preview annotations. Both should still use
  GNOME's unchanged output path, and the PR 4 preview should not be saved yet.
