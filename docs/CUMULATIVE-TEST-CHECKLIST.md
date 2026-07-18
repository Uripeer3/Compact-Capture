# Cumulative manual test checklist

This file consolidates every test from `PR5-TESTING.md` through
`PR11-TESTING.md`. It records only results obtained against commit `5e68dd4`
on 2026-07-18. Checks performed only before that commit was pulled are not
credited as passes here. Future PR test contracts must reference and extend
this checklist as required by `ROADMAP.md`.

The branch later advanced to `8632eb8`, which contains the candidate
device-pixel dirty-clip fix and a real-Cairo regression test for the failure
recorded in P11-D2, P11-D4 and P11-D5. Those manual results intentionally
remain failed until the affected real-session rows are rerun on the newer
commit.

Post-pull automated validation on `8632eb8` passed `npm test`,
`npm run check`, `npm run benchmark`, `npm run test:gjs` and `./build.sh`.
The GJS test reported pixel-identical dirty redraws at 1x and 2x. This confirms
the regression fixture, but it does not replace the outstanding real-session
rerun.

## Status key

- `[x] PASS`: the complete row was exercised and met its expected result.
- `[x] FAIL`: the complete row was exercised and produced a reproducible defect.
- `[x] PARTIAL`: part of a compound row was exercised, but the row is incomplete.
- `[x] BLOCKED`: execution was attempted, but the environment could not produce
  a valid result.
- `[ ] NOT RUN`: no current-commit result was collected.

## Test record

| Field | Value |
| --- | --- |
| Date | 2026-07-18 |
| Commit | `5e68dd4` (`Harden bounded rendering and selection recovery`) |
| Shell | GNOME Shell 50.3, Wayland, fresh nested session |
| Displays exercised | Virtual 1920x1080 at 100% and 200%; 3840x2160 output at 200% |
| Important limitations | Nested cursor had no texture; external clipboard reader had no keyboard seat; no touch device; no fresh-build mixed-monitor session |

| Total rows | Pass | Fail | Partial | Blocked | Not run |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 123 | 35 | 4 | 26 | 3 | 55 |

## PR 5 - Output integration

### Native pass-through

| Run | ID | Test | Result / evidence |
| --- | --- | --- | --- |
| [ ] | P5-N1 | Open ScreenshotUI and capture an area without drawing. | **NOT RUN** with the extension enabled on the current commit. |
| [ ] | P5-N2 | Confirm clipboard and PNG are unchanged and GNOME emits its normal sound and notification exactly once. | **NOT RUN**; clipboard, sound and notification parity were not observed together. |
| [ ] | P5-N3 | Repeat native pass-through for Screen and Window capture. | **NOT RUN** as a complete row. |
| [x] | P5-N4 | Confirm screen recording remains unchanged. | **PARTIAL**; recording mode remained native and annotation actors were removed, but an actual recording was not completed. |

### Annotated output

| Run | ID | Test | Result / evidence |
| --- | --- | --- | --- |
| [x] | P5-A1 | Select an area and draw with every supported tool. | **PASS**; freehand, rectangle, arrow and highlighter were drawn with real pointer input. |
| [x] | P5-A2 | Capture separately with the round button, Enter and Ctrl+C. | **PARTIAL**; saved captures were completed, but all three activation paths were not validated separately. |
| [x] | P5-A3 | Confirm preview, clipboard and PNG contain identical completed annotations. | **PARTIAL**; preview and PNG matched visually; clipboard could not be read from the nested seat. |
| [x] | P5-A4 | With GNOME's pointer option on, confirm pointer and annotations appear once; with it off, confirm pointer is absent. | **BLOCKED**; pointer-off passed, but the nested cursor actor had no texture for pointer-on validation. |
| [x] | P5-A5 | Repeat annotated capture in Screen mode and on a secondary monitor if available. | **PARTIAL**; Screen output passed at 200%; no fresh-build secondary-monitor run. |

### Scale, cleanup and failure safety

| Run | ID | Test | Result / evidence |
| --- | --- | --- | --- |
| [x] | P5-S1 | Repeat at 100% and 200%; line scale and positions match preview. | **PASS**; Area and Screen PNG dimensions, placement and sharpness were correct. |
| [ ] | P5-S2 | Repeat on mixed-scale monitors if available. | **NOT RUN** on a fresh build. |
| [ ] | P5-S3 | Capture once with several long strokes; no duplicate file or notification is created. | **NOT RUN** as specified. |
| [x] | P5-S4 | Close and reopen after capture; native pointer and old annotations do not remain. | **PARTIAL**; reopening produced an empty document and clean native area state, but cursor restoration could not be visually verified. |
| [x] | P5-S5 | Disable Compact Capture; GNOME screenshot output is unchanged. | **PARTIAL**; native selector geometry and capture button were restored and capture saved, but pixel parity with an extension-free baseline was not compared. |

## PR 6 - History and controls

### History controls

| Run | ID | Test | Result / evidence |
| --- | --- | --- | --- |
| [x] | P6-H1 | Draw two visibly different annotations. | **PASS**; multiple distinct tools and overlapping annotations were used. |
| [x] | P6-H2 | Undo twice; annotations disappear in reverse order. | **PASS**; single undo and a later ten-undo sequence removed the expected newest marks. |
| [x] | P6-H3 | Redo twice; annotations return in original order. | **PASS**; single redo and a later five-redo sequence restored ordering. |
| [x] | P6-H4 | Undo once, draw a replacement and confirm Redo becomes insensitive. | **PASS**; document went 50 -> 49 -> 50 and `canRedo` became false. |
| [x] | P6-H5 | Clear; Undo, Redo and Clear become insensitive. | **PARTIAL**; document cleared and undo/redo became unavailable; Clear's visual insensitive state was not explicitly inspected. |

### Keyboard

| Run | ID | Test | Result / evidence |
| --- | --- | --- | --- |
| [ ] | P6-K1 | Draw two annotations, then use Ctrl+Z and Ctrl+Shift+Z. | **NOT RUN** on the current commit. |
| [ ] | P6-K2 | Repeat redo with Ctrl+Y. | **NOT RUN** on the current commit. |
| [ ] | P6-K3 | With no gesture active, press Esc; GNOME closes ScreenshotUI normally. | **NOT RUN** as an isolated assertion. |
| [x] | P6-K4 | Confirm GNOME area, screen, window, capture and copy shortcuts still work. | **PARTIAL**; empty-area Enter/Space/Ctrl+C gating and native Enter after disable passed; the full shortcut matrix did not run. |

### Hover hints

| Run | ID | Test | Result / evidence |
| --- | --- | --- | --- |
| [ ] | P6-T1 | Hover a drawing tool until its hint appears, then leave; it disappears immediately. | **NOT RUN** on the current commit. |
| [ ] | P6-T2 | Hover Undo, click it while one annotation remains, and keep the pointer still; its hint disappears when disabled. | **NOT RUN**. |
| [ ] | P6-T3 | Repeat with Clear; no hint remains when the document is empty. | **NOT RUN**. |
| [ ] | P6-T4 | Undo, Redo and Clear retain no hover, focus or pressed background when disabled. | **NOT RUN**. |
| [ ] | P6-T5 | Move rapidly across controls; at most one hint remains after stopping. | **NOT RUN**. |
| [ ] | P6-T6 | Close ScreenshotUI with a visible and a pending hint; neither survives and no journal error occurs. | **NOT RUN** on the current commit. |

### Lifecycle and output

| Run | ID | Test | Result / evidence |
| --- | --- | --- | --- |
| [x] | P6-L1 | Close and reopen ScreenshotUI; history starts empty. | **PASS**. |
| [x] | P6-L2 | Switch among Area, Screen and Recording; no stale history or enabled action remains. | **PASS**; Area/Screen and Screenshot/Recording round trips cleared state correctly. |
| [x] | P6-L3 | Disable while ScreenshotUI is open; GNOME capture works without shortcut interception. | **PASS**. |
| [x] | P6-L4 | Undo/redo results are identical in preview, clipboard and PNG. | **PARTIAL**; preview parity was checked and exposed the PR11 alpha defect; clipboard/output parity was not completed. |
| [x] | P6-L5 | Check journal for new JS ERROR or Compact Capture failures. | **PASS**; final extension state was enabled with an empty error field and no extension JS error. |

## PR 7 - Toolbar interaction

### Interaction targets and states

| Run | ID | Test | Result / evidence |
| --- | --- | --- | --- |
| [ ] | P7-I1 | Compare hit areas for every tool, colour and action button. | **NOT RUN** systematically. |
| [ ] | P7-I2 | Check hover, pressed and selected states in light and dark Shell styles; swatches remain circular. | **NOT RUN**. |
| [ ] | P7-I3 | Exercise Undo, Redo and Clear; disabled actions have no hover or hint and enabled actions restore them. | **NOT RUN** as a visual-state test. |
| [ ] | P7-I4 | Use Tab/Shift+Tab; focus rings remain visible and Enter/Space activate focused buttons. | **NOT RUN**. |
| [ ] | P7-I5 | Verify Highlighter defaults to width 12, regular tools to 3, and customized per-tool widths are restored. | **NOT RUN** on the current commit. |

### Shared hints

| Run | ID | Test | Result / evidence |
| --- | --- | --- | --- |
| [ ] | P7-H1 | Every control shows its hint after a short delay. | **NOT RUN**. |
| [ ] | P7-H2 | Rapid toolbar movement leaves at most one current hint. | **NOT RUN**. |
| [ ] | P7-H3 | Leaving with a pending or visible hint clears it and control highlighting. | **NOT RUN**. |
| [ ] | P7-H4 | Keyboard-focused controls use the same hints, which follow focus and close with ScreenshotUI. | **NOT RUN**. |

### Responsive placement

| Run | ID | Test | Result / evidence |
| --- | --- | --- | --- |
| [ ] | P7-R1 | Test selections at every monitor edge/corner; toolbar placement avoids resize handles when possible. | **NOT RUN** comprehensively. |
| [ ] | P7-R2 | Test a narrow selection at 100%/200%, secondary and mixed-scale monitors; toolbar remains centered and constrained. | **NOT RUN** as specified. |
| [ ] | P7-R3 | On a monitor narrower than the toolbar, overflow remains balanced. | **NOT RUN**. |
| [x] | P7-R4 | Reopen repeatedly; no tooltip, focus highlight or toolbar actor survives. | **PARTIAL**; five lifecycle cycles left no toolbar/overlay actor, but tooltip/focus state was not explicitly inspected. |

## PR 8 - Rendering performance and budgets

### Automated benchmark

| Run | ID | Test | Result / evidence |
| --- | --- | --- | --- |
| [x] | P8-B1 | Run tests, syntax check and benchmark; benchmark reaches 65,536 points, reuses one render view for 100,000 calls and snapshots all points. | **PASS**; all commands completed. Recorded times: build 25.079 ms, render lookup 1.272 ms, snapshot 10.11 ms. |

### Live rendering

| Run | ID | Test | Result / evidence |
| --- | --- | --- | --- |
| [x] | P8-L1 | Build many long freehand/highlighter strokes; another long live stroke remains responsive. | **PARTIAL**; 50 annotations remained responsive, but the specified history-heavy live freehand/highlighter case did not run. |
| [ ] | P8-L2 | Span a selection across two monitors; both overlays show an identical live draft. | **NOT RUN**. |
| [x] | P8-L3 | Undo, Redo and Clear substantial history; one refresh leaves no stale pixels. | **PARTIAL**; 50-mark undo/redo/Clear stayed visually clean, but refresh count was not instrumented and strict alpha parity failed separately. |
| [x] | P8-L4 | Switch among freehand, rectangle and arrow; preview and committed output remain unchanged from PR7. | **PASS** visually for the supported tools. |

### Scale and lifecycle

| Run | ID | Test | Result / evidence |
| --- | --- | --- | --- |
| [x] | P8-S1 | At 100%, 200% and mixed scale, cached strokes and live draft have identical sharpness, width and alignment. | **PARTIAL**; 100% and 200% passed; mixed-scale did not run. |
| [x] | P8-S2 | Move/recreate selection so actors rebuild; old cache surfaces disappear. | **PASS**; mode transitions rebuilt/removed actors and returned with an empty document. |
| [x] | P8-S3 | Reopen repeatedly after drawing; no Cairo, allocation or Compact Capture journal errors. | **PARTIAL**; lifecycle and extension logs were clean, but the nested compositor emitted generic Clutter allocation warnings, so the row cannot be accepted on this harness. |
| [x] | P8-S4 | Copy and save a history-heavy capture; preview, clipboard and PNG match. | **PARTIAL**; a 50-annotation 4K PNG saved, but clipboard parity was blocked. |

### Budget behavior

| Run | ID | Test | Result / evidence |
| --- | --- | --- | --- |
| [x] | P8-G1 | Exercise the full point budget with the benchmark; automated tests cover draft, committed, redo and Clear bounds. | **PASS**. |

## PR 9 - Native selection lifecycle

### Initial mode and mode return

| Run | ID | Test | Result / evidence |
| --- | --- | --- | --- |
| [x] | P9-I1 | Open normal Area mode; shade and hint appear without a default selection rectangle. | **PASS**. |
| [x] | P9-I2 | Open from GNOME's recording shortcut in Area, then switch to Screenshot; Area is empty, hinted and gated. | **PARTIAL**; the Recording -> Screenshot state passed, but it was not opened through the GNOME shortcut. |
| [x] | P9-I3 | Start in Screenshot Area, switch to Recording and back without dragging; empty Area and hint return. | **PASS**. |
| [ ] | P9-I4 | In Recording Area, drag a region and switch to Screenshot; retain it and show annotation controls. | **NOT RUN** on the current commit. |

### Capture transitions

| Run | ID | Test | Result / evidence |
| --- | --- | --- | --- |
| [x] | P9-C1 | From empty Area choose Screen; hint disappears, selected monitor is drawable and screen capture remains active. | **PASS**. |
| [x] | P9-C2 | Return to Area; it starts empty rather than using GNOME's default rectangle. | **PASS**. |
| [ ] | P9-C3 | Go through Window and back to Area; Window remains native and Area restores the empty gate. | **NOT RUN** on the current commit. |
| [x] | P9-C4 | Drag and resize Area; native geometry is retained and controls align to one selected state. | **PARTIAL**; first drag and exact native geometry passed; post-pull resize was not separately exercised. |

### Recreated screen selectors

| Run | ID | Test | Result / evidence |
| --- | --- | --- | --- |
| [ ] | P9-R1 | Select a non-primary monitor; toolbar and overlay follow it. | **NOT RUN** on the current commit. |
| [ ] | P9-R2 | Close, change monitor layout/scale so monitor actors rebuild, then reopen. | **NOT RUN** as specified. |
| [ ] | P9-R3 | Choose another non-primary monitor; rebuilt overlay and saved annotations target it. | **NOT RUN**. |
| [ ] | P9-R4 | Repeat monitor replacement twice; no stale disconnect errors or duplicate callbacks. | **NOT RUN**. |

### Cleanup

| Run | ID | Test | Result / evidence |
| --- | --- | --- | --- |
| [x] | P9-X1 | Close from each mode and reopen; no selection, hint or annotation state leaks. | **PARTIAL**; repeated Area lifecycle and mode round trips passed, but reopen-from-every-mode was not enumerated. |
| [x] | P9-X2 | Disable while Area is empty; native visuals, capture button and shortcuts return. | **PASS**. |

## PR 10 - Capture transactions and touch

### Capture during a gesture

| Run | ID | Test | Result / evidence |
| --- | --- | --- | --- |
| [ ] | P10-G1 | Press Ctrl+C during a freehand gesture; visible content is frozen in clipboard and later movement cannot change it. | **NOT RUN**. |
| [ ] | P10-G2 | Capture Rectangle, Arrow and Highlighter during gestures using Enter and the native button; each commits once. | **NOT RUN**. |
| [ ] | P10-G3 | Capture before a gesture gains a second point; discard the incomplete mark and finish native capture. | **NOT RUN**. |

### Input freeze and recovery

| Run | ID | Test | Result / evidence |
| --- | --- | --- | --- |
| [ ] | P10-F1 | During output preparation, drawing/tool/width/Clear/Undo/Redo controls freeze and output retains activation-time state. | **NOT RUN** manually. |
| [ ] | P10-F2 | Trigger Ctrl+C and Enter quickly; exactly one save and notification occurs. | **NOT RUN**. |
| [ ] | P10-F3 | Force preparation failure or unsupported cursor; native fallback succeeds and editing unlocks. | **NOT RUN** manually; automated failure tests passed. |
| [ ] | P10-F4 | Close or disable during prepared capture; reopening has no lock, stage grab or draft. | **NOT RUN** during an active prepared capture. |

### Touch ownership

| Run | ID | Test | Result / evidence |
| --- | --- | --- | --- |
| [ ] | P10-T1 | Start with one finger and move a second; only the owner updates the line. | **NOT RUN**; no touch device or valid touch injection stream was available. |
| [ ] | P10-T2 | Lift the second finger first; the owner remains active and commits once. | **NOT RUN**. |
| [ ] | P10-T3 | Cancel the second sequence; it does not cancel the owner. | **NOT RUN**. |
| [ ] | P10-T4 | After completion/cancellation, the other finger can own a new gesture. | **NOT RUN**. |

### Regression checks

| Run | ID | Test | Result / evidence |
| --- | --- | --- | --- |
| [x] | P10-R1 | Verify normal pointer drawing, history, Clear, saved files and clipboard with no capture-time gesture. | **PARTIAL**; all except clipboard passed. |
| [x] | P10-R2 | Verify empty documents, Window capture and recording remain entirely native. | **PARTIAL**; empty documents and Recording mode passed; current-commit Window capture did not run. |
| [x] | P10-R3 | Check journal after every failure and cleanup scenario. | **PARTIAL**; final journal/state check passed, but manual failure scenarios were not run. |

## PR 11 - Bounded cache and selection recovery

### Build and install

| Run | ID | Test | Result / evidence |
| --- | --- | --- | --- |
| [x] | P11-B1 | Run `npm test`, `npm run check`, `npm run benchmark` and `./build.sh`. | **PASS**; 18 test files passed, check/build passed and archive integrity was valid. |
| [x] | P11-B2 | Enable the installed extension without a compatibility error. | **PASS** in a fresh nested GNOME 50.3 session. |
| [x] | P11-B3 | Establish a baseline with no new Compact Capture or JavaScript error. | **PASS**. |

### Native selection lifecycle

| Run | ID | Test | Result / evidence |
| --- | --- | --- | --- |
| [x] | P11-N1 | Open Area: shade and hint remain; default rectangle and toolbar are hidden. | **PASS**; native selection actors were hidden and selector geometry was parked. |
| [x] | P11-N2 | Before an area exists, Enter, Space and Ctrl+C cannot capture. | **PASS**; no file was created and UI remained open. |
| [x] | P11-N3 | First drag shows native border/handles, hides hint and places toolbar outside selection. | **PASS**; geometry matched the drag exactly. |
| [x] | P11-N4 | Recording-first Area route returns to an empty Screenshot state. | **PARTIAL**; state transition passed, but entry was not through GNOME's recording shortcut. |
| [x] | P11-N5 | Area -> Screen -> Area and Screenshot -> Recording -> Screenshot remain consistent. | **PASS**. |
| [ ] | P11-N6 | Replace monitor layout, reopen, and choose each screen; toolbar/overlay follow current selector. | **NOT RUN** on the fresh build. |
| [x] | P11-N7 | Disable while open; native selector, handles and capture button return. | **PASS**; native capture then saved successfully. |

### Drawing, history and incremental cache

| Run | ID | Test | Result / evidence |
| --- | --- | --- | --- |
| [x] | P11-D1 | All four tools preserve preview/commit parity, including overlaps and edge strokes. | **PASS** visually. |
| [x] | P11-D2 | Highlighter overlaps retain identical colour/alpha after undo and redo. | **FAIL**; 24 annotation-region pixels changed at fractional dirty-clip boundaries, stable over ten cycles. |
| [x] | P11-D3 | Commit at least 50 short shapes rapidly; Shell remains responsive and no mark disappears. | **PASS** at 100% and 4K/200%. |
| [x] | P11-D4 | Undo 10; removed marks leave no holes or ghosts in overlaps. | **FAIL** under pixel comparison; the same fractional dirty clip altered translucent overlap pixels. |
| [x] | P11-D5 | Redo 5; marks restore in original order and appearance. | **FAIL** under pixel comparison; ordering was correct, but 24 annotation-region pixels did not return exactly. |
| [x] | P11-D6 | Undo, draw a replacement, then verify Redo is unavailable. | **PASS**. |
| [x] | P11-D7 | Clear removes all marks without recreating toolbar or selection. | **PASS**. |
| [x] | P11-D8 | Repeat cache/reset at 100%, 200% and mixed scale; strokes remain sharp and placed correctly. | **PARTIAL**; 100% and 200% passed, mixed scale did not run. |

### Saved and copied output matrix

Each matrix row requires preview, clipboard and PNG parity, so rows without a
readable clipboard are incomplete even when the saved PNG passed.

| Run | ID | Scale | Capture | Pointer | Result / evidence |
| --- | --- | ---: | --- | --- | --- |
| [x] | P11-O1 | 100% | Area | Off | **PARTIAL**; PNG passed at 801x601, clipboard unavailable. |
| [x] | P11-O2 | 100% | Area | On | **BLOCKED**; nested cursor actor had no texture. |
| [ ] | P11-O3 | 100% | Screen | Off | **NOT RUN** as a complete current-commit output row. |
| [ ] | P11-O4 | 100% | Screen | On | **NOT RUN**; the missing cursor texture was already established in the Area run. |
| [x] | P11-O5 | 200% | Area | Off | **PARTIAL**; sharp 1502x662 PNG passed, clipboard unavailable. |
| [ ] | P11-O6 | 200% | Area | On | **NOT RUN**; the missing cursor texture was already established at 100%. |
| [x] | P11-O7 | 200% | Screen | Off | **PARTIAL**; sharp 1920x1080 PNG passed, clipboard unavailable. |
| [ ] | P11-O8 | 200% | Screen | On | **NOT RUN**; the missing cursor texture was already established at 100%. |
| [ ] | P11-O9 | Pointer-on Area at inside, every edge and outside positions; no clip, wrap, duplicate or scale error; inspect premultiplied-alpha overlap. |  |  | **NOT RUN**; cursor content was unavailable. |

### Failure and teardown

| Run | ID | Test | Result / evidence |
| --- | --- | --- | --- |
| [x] | P11-F1 | Close with annotations; reopening starts with a clean document and empty native Area. | **PASS**. |
| [x] | P11-F2 | Disable after selection; no toolbar/overlay remains and GNOME capture works. | **PASS**. |
| [ ] | P11-F3 | Capture, then close quickly; reopening restores native cursor visibility, position and scale. | **NOT RUN** as specified. |
| [x] | P11-F4 | Five enable/disable cycles leave no stuck shade, hidden handle, inactive capture button or journal error. | **PASS**. |

### 4K/200% performance

| Run | ID | Test | Result / evidence |
| --- | --- | --- | --- |
| [ ] | P11-P1 | Parent commit, pointer off: warm up, run ten captures, record median and largest RSS rise. | **NOT RUN**. |
| [ ] | P11-P2 | Parent commit, pointer on: warm up, run ten captures, record median and largest RSS rise. | **NOT RUN**. |
| [x] | P11-P3 | PR11, pointer off: warm up, run ten captures, record median and largest RSS rise. | **BLOCKED**; 50-shape interaction/RSS was measured, but private-API capture timing was invalid and discarded. |
| [ ] | P11-P4 | PR11, pointer on: warm up, run ten captures, record median and largest RSS rise. | **NOT RUN**; the absent nested cursor texture invalidated the required setup. |

### Final acceptance

| Run | ID | Test | Result / evidence |
| --- | --- | --- | --- |
| [x] | P11-X1 | Full journal review contains no unexplained Compact Capture or JavaScript error. | **PASS** for extension paths; the harness-induced Cogl warning is explained above. |
| [x] | P11-X2 | Every required PR11 row passes. | **FAIL**; one cache-parity defect remains and several hardware-dependent rows are incomplete. |
| [ ] | P11-X3 | Record reviewer name and date before merge. | **NOT RUN**; PR11 is not ready for manual acceptance. |

## Current blockers and next run

1. Rerun P11-D2, P11-D4, P11-D5 and the related output-parity rows against the
   device-pixel alignment fix in `8632eb8`.
2. Log into a fresh real GNOME session with the pulled build to complete the
   clipboard, pointer, Window, shortcut and notification matrices.
3. Use the physical mixed-scale monitors for PR5-S2, PR8-S1, PR9-R1 through
   PR9-R4 and PR11-N6/D8.
4. Run the PR10 gesture/freeze cases with real capture activation and use a
   real touch device for PR10-T1 through PR10-T4.
5. Run the parent and PR11 4K performance matrices with ten pointer-off and ten
   pointer-on samples per build.

## PR 12 - Pixelate and blur

The detailed procedure and environment record live in
[`PR12-TESTING.md`](PR12-TESTING.md). Results below remain empty until rerun on
the PR12 commit; implementation or automated coverage alone is not a Pass.

| Run | ID | Test | Result / evidence |
| --- | --- | --- | --- |
| [ ] | P12-C1 | Context controls switch between colour/width and Pixelate/Blur/intensity, with focus and hover hints intact. | **NOT RUN**. |
| [ ] | P12-C2 | Create both treatments, resize every corner, and verify style changes remain one undo action. | **NOT RUN**. |
| [ ] | P12-O1 | Preview, clipboard and PNG match for Area and Screen at 100%/200%, pointer off/on. | **NOT RUN**. |
| [ ] | P12-O2 | Mixed-scale spanning selection has no preview/output seam, offset or fringe. | **NOT RUN**. |
| [ ] | P12-P1 | At 4K/200%, near-full and many-small-region creation, resize, capture, undo and Clear remain bounded. | **NOT RUN**. |
| [ ] | P12-F1 | Render failure, lifecycle changes and disable leave native capture usable with no stale actor/cursor. | **NOT RUN**. |
| [ ] | P12-X1 | Privacy wording, full journal and applicable cumulative regressions are accepted. | **NOT RUN**. |
