# PR 12 manual test checklist

PR 12 is not manually accepted until the applicable rows below pass on a real
GNOME 50 session. Node tests validate bounds, budgets, texture coordinates and
history; they do not execute GNOME's live Clutter/Cogl path or prove pixel
parity. Carry unresolved applicable rows from the
[cumulative checklist](CUMULATIVE-TEST-CHECKLIST.md) into the final review.

## Test environment

| Field | Value |
| --- | --- |
| Fedora version |  |
| GNOME Shell / Mutter |  |
| Session (Wayland/X11) |  |
| GPU / driver |  |
| Monitors and scale |  |
| PR commit |  |

## Build and baseline

Run:

```sh
npm test
npm run check
npm run benchmark
npm run test:gjs
./build.sh
gnome-extensions install --force \
  dist/compact-capture@uripeer3.github.io.shell-extension.zip
```

Start a fresh GNOME session after replacing JavaScript, then keep this journal
check available:

```sh
journalctl --user -b -o cat |
  grep -E 'Compact Capture|JS ERROR|Gjs-Message' |
  tail -100
```

| Check | Expected result | Result / notes |
| --- | --- | --- |
| Automated commands | Tests, syntax, benchmark, GJS regression and build pass |  |
| Extension enable | Adapter enables on GNOME 50 without compatibility errors |  |
| Baseline | Area selection, all four drawing tools, history and native capture remain unchanged |  |

## Obscure workflow and controls

| Check | Expected result | Result / notes |
| --- | --- | --- |
| Tool switch | Obscure replaces colours with Pixelate/Blur choices; slider hint/name becomes Effect intensity; switching back restores colours and Line width |  |
| Default | A new session and newly selected Obscure tool default to Pixelate |  |
| Create | Dragging shows a restrained outline; release shows the processed region and four equal corner handles |  |
| Resize | Every corner anchors its opposite corner; the outline follows the pointer and processing updates once on release |  |
| Treatment | Pixelate/Blur updates the latest active region without adding another undo step |  |
| Intensity | Minimum and maximum are visibly different and remain responsive while dragging the slider |  |
| History | Undo removes the resized region once; Redo restores its final bounds, treatment and intensity; divergent drawing invalidates Redo |  |
| Limits | Many/large regions fail gracefully at the documented area budget; drawing, Undo and Clear remain usable |  |
| Accessibility | Obscure, Pixelate, Blur and intensity have clear states; all toolbar controls retain keyboard focus and hover hints |  |

## Preview and output parity

For every row, overlap Pixelate and Blur with freehand, rectangle and a
translucent highlighter. Capture once with `Ctrl+C`, once with `Enter`, and once
with GNOME's capture button. Compare the visible preview, clipboard image and
saved PNG at 100% zoom.

| Scale | Capture | Pointer | Expected | Result / notes |
| ---: | --- | --- | --- | --- |
| 100% | Area | Off | Exact effect bounds and treatment match |  |
| 100% | Area | On | Match; pointer appears exactly once |  |
| 100% | Screen | Off | Match, including monitor edges |  |
| 100% | Screen | On | Match; pointer clips correctly |  |
| 200% | Area | Off | Bounds align to device pixels with no fringe |  |
| 200% | Area | On | Match; pointer remains correctly scaled |  |
| 200% | Screen | Off | Match with stable block/blur intensity |  |
| 200% | Screen | On | Match; no duplicate or shifted cursor |  |
| Mixed scale | Spanning Area | Off | Each monitor preview aligns; output has no seam or offset |  |

Also capture during creation and resize. Output must contain either the
complete visible final region or the previous committed region—never partial
geometry or a later asynchronous edit.

## Performance and recovery

Use 4K output at 200% where available. Cover one near-full-screen region and
many small regions whose total approaches the area budget.

| Check | Expected result | Result / notes |
| --- | --- | --- |
| Live creation | Pointer outline stays responsive; no source texture is regenerated on every motion event |  |
| Resize | Pointer stays responsive; processed preview updates on release |  |
| Rapid style changes | Shell remains interactive and memory settles after old preview actors are destroyed |  |
| Capture time | Record ten Pixelate and ten Blur captures; no obvious Shell stall or unbounded RSS growth |  |
| Undo/Clear | Preview textures disappear immediately and repeated cycles do not grow RSS continuously |  |
| Failure | If source preview/output preparation fails, GNOME capture remains usable with one actionable log error |  |
| Lifecycle | Close, reopen, switch modes/monitors and disable; no preview actor, handle, grab or modified cursor remains |  |

| Treatment | Region set | Median time | Largest RSS increase |
| --- | --- | ---: | ---: |
| Pixelate | Near full screen |  |  |
| Blur | Near full screen |  |  |
| Pixelate | Many small regions |  |  |
| Blur | Many small regions |  |  |

## Privacy wording and final acceptance

Confirm the README, design and architecture documents describe Pixelate and
Blur as visual obscuring aids—not secure redaction. Do not use this feature for
secrets that require irreversible removal.

| Check | Expected result | Result / notes |
| --- | --- | --- |
| Full journal review | No unexplained Compact Capture or JavaScript error |  |
| Cumulative regressions | Applicable carried-forward rows pass or are explicitly documented |  |
| Reviewer | Name/date and tested commit recorded before merge |  |
