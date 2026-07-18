# PR 8 manual test contract

Run the automated checks and the allocation benchmark first:

```sh
npm test
npm run check
npm run benchmark
```

Benchmark times are machine-specific. Confirm that it reaches 65,536 points,
that 100,000 unchanged `renderView()` calls reuse one object, and that the final
deep snapshot contains the same number of points.

## Live rendering

1. Draw many long freehand and highlighter strokes, then begin another long
   stroke. Pointer tracking should remain responsive as committed history
   grows.
2. Repeat with a selection spanning two monitors. Both overlays must show the
   same live draft without duplicate, missing or offset segments.
3. Exercise Undo, Redo and Clear after building substantial history. Each
   action must refresh committed content once and leave no stale pixels.
4. Switch between freehand and the two-point rectangle and arrow tools. Preview
   and committed output must remain unchanged from PR 7.

## Scale and lifecycle

1. Repeat at 100% and 200% scaling and, where available, across mixed-scale
   monitors. Cached strokes and the live draft must have identical sharpness,
   width and alignment.
2. Move or recreate the selection so annotation actors are rebuilt. Old cache
   surfaces must disappear with their overlays.
3. Close and reopen ScreenshotUI repeatedly after drawing. Watch the user
   journal for Cairo, allocation or Compact Capture errors.
4. Copy and save a history-heavy annotated capture. Preview, clipboard and PNG
   output must remain visually identical; the final output path may perform one
   isolated deep snapshot.

## Budget behavior

The production limits are intentionally too large for ordinary manual use.
Use `npm run benchmark` to exercise the full point budget. Automated tests use
small injected limits to verify that drafts, committed strokes and redo history
cannot exceed the session-wide bounds, and that Clear releases the budget.
