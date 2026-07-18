# PR 10 manual test contract

Run the Shell-independent checks first:

```sh
npm test
npm run check
npm run benchmark
```

## Capture during a gesture

1. Draw a freehand line and press `Ctrl+C` before releasing the pointer.
   Confirm the visible portion of the line appears in the clipboard image and
   no later pointer movement changes that capture.
2. Repeat with Rectangle, Arrow and Highlighter using `Enter` and the native
   capture button. Confirm each visible shape is committed once, without a
   duplicate or missing final segment.
3. Press capture immediately after a drawing begins, before it has a second
   point. Confirm the incomplete mark is discarded and native capture still
   completes.

## Input freeze and recovery

1. Capture an annotated area and, while output is being prepared, try drawing,
   changing tools, moving the width slider, clearing and using undo/redo.
   Annotation controls should be insensitive and the saved output should
   contain exactly the state visible when capture began.
2. Trigger `Ctrl+C` and `Enter` in quick succession. Confirm there is one save
   operation, one notification and no duplicate or differently annotated
   output.
3. Force output preparation to fail temporarily, or use an unsupported cursor
   texture. Confirm GNOME completes its unchanged fallback capture and editing
   becomes available again afterward.
4. Close ScreenshotUI or disable the extension during a prepared capture.
   Reopen it and confirm no input lock, stage grab or draft leaks into the new
   session.

## Touch ownership

1. Begin a line with one finger, then move a second finger across the drawing
   area. Only the first finger should update the line.
2. Lift the second finger first. The first finger's gesture must remain active;
   lifting the first finger should commit it once.
3. Repeat while cancelling the second touch sequence. It must not cancel the
   first finger's gesture.
4. After the first gesture finishes or is cancelled, begin with the other
   finger and confirm it can own a new gesture normally.

## Regression checks

1. Verify ordinary pointer drawing, undo, redo, clear, saved files and
   clipboard copies with no capture-time gesture.
2. Verify empty documents, Window capture and screen recording remain entirely
   native.
3. Check the user journal for `Compact Capture`, `JS ERROR` and `Gjs-Message`
   entries after every failure and cleanup scenario.
