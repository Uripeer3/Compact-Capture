# PR 14 release acceptance checklist

PR 14 is the Version 0.1 release candidate. Record results against the exact
candidate commit in
[CUMULATIVE-TEST-CHECKLIST.md](CUMULATIVE-TEST-CHECKLIST.md). Leave a row blank
or mark it blocked when the required hardware is unavailable; do not infer a
manual pass from automated coverage.

## Automated and package checks

| Test | Required result | Result / evidence |
| --- | --- | --- |
| Node suite | `npm test` passes |  |
| Syntax | `npm run check` passes |  |
| Bounded work | `npm run benchmark` reports 65,536 points and completes document snapshot plus SVG serialization without failure |  |
| GJS pixels | `npm run test:gjs` passes horizontal and diagonal-cap Cairo dirty-redraw parity at 1×/2×, plus small and 4K in-memory SVG rasterization; record the reported 4K time |  |
| Build | `./build.sh` creates the GNOME extension ZIP |  |
| Manifest | `bash tools/verify-package.sh` accepts the ZIP and rejects no runtime entry |  |
| Review audit | No Shell runtime module imports `Gdk`, `Gtk` or `Adw`; metadata, attribution and package contents match the current GNOME review rules |  |

## Session matrix

Use Fedora Workstation, Wayland and GNOME 50. Record the GNOME Shell version,
GPU, monitor layout and candidate commit.

| ID | Environment | Required result | Result / evidence |
| --- | --- | --- | --- |
| P14-S1 | One monitor, 100% | Area and Screen workflows pass the cumulative core matrix |  |
| P14-S2 | One HiDPI monitor, 200% | Toolbar, drawing, copied output and saved PNG retain scale and alignment |  |
| P14-S3 | Mixed 100%/200% monitors | Selection, toolbar and annotations remain on the selected monitor; output is neither shifted nor clipped |  |
| P14-S4 | Monitor connect/disconnect | Close ScreenshotUI first; the next session rebinds selectors and leaves no stale overlay |  |

## Output parity

For each supported scale, test Area and Screen capture with freehand, rectangle,
arrow and overlapping highlighter strokes. Repeat with the pointer off and on.

| ID | Required result | Result / evidence |
| --- | --- | --- |
| P14-O1 | Live preview, clipboard image and saved PNG contain the same geometry, colours and line widths |  |
| P14-O2 | Highlighter remains translucent; overlap and edge pixels show no dark fringe or opaque background |  |
| P14-O3 | Pointer edges, hotspot, clipping and scale match GNOME output |  |
| P14-O4 | Empty document, Window capture and recording remain pixel/behavior compatible with native GNOME |  |
| P14-O5 | Ten repeated captures leave clipboard/save functional and produce no unexplained journal error |  |
| P14-O6 | Undo and redo a width-16 diagonal highlighter at 100% and 200%; its square end caps leave no stale or missing pixels |  |
| P14-O7 | In Screen mode, drawing can start at every screen edge; in Area mode, resize handles remain usable instead |  |

## Performance and bounded behavior

Use a 4K output at 200% where available. Record `gnome-shell` RSS before the
run, after one warm-up capture, and after ten measured captures. Test once with
the pointer off and once with it on.

| ID | Required result | Result / evidence |
| --- | --- | --- |
| P14-P1 | A maximum-length freehand stroke remains responsive while drawing; the toolbar and selector still react |  |
| P14-P2 | A document near the 65,536-point budget captures successfully or fails open to native GNOME without freezing Shell |  |
| P14-P3 | Ten 4K captures complete without an increasing persistent RSS trend or a Shell restart |  |
| P14-P4 | SVG output preparation adds no temporary file, subprocess, network access or intermediate PNG |  |
| P14-P5 | Output estimated above the 128 MiB annotation budget logs one bounded failure and GNOME still saves/copies the unannotated native image without freezing Shell |  |
| P14-P6 | After Clear, idle Shell RSS does not retain one additional full-monitor Cairo surface per overlay; drawing again reallocates normally |  |

For P14-P5, pointer-enabled 5120×2880 output exceeds the budget. If that output
size cannot be produced by the available monitor layout, mark the row blocked
rather than weakening the limit or inferring a pass.

## Lifecycle and accessibility regression

| ID | Required result | Result / evidence |
| --- | --- | --- |
| P14-L0 | After a fresh login, enabling the extension succeeds without a module-load or gettext error |  |
| P14-L1 | Selection-first hint, native shade and toolbar timing match the Version 0.1 design |  |
| P14-L2 | Hover/focus hints clear after pointer exit, focus change, capture, close and disable |  |
| P14-L3 | Keyboard focus, checked and insensitive states remain visible at 100% and 200% |  |
| P14-L4 | Five enable/disable and five open/close cycles restore every GNOME actor and shortcut |  |
| P14-L5 | Full journal review contains no unexplained Compact Capture, GJS, GdkPixbuf or Cogl error |  |
| P14-L6 | Start a capture, then close ScreenshotUI or disable the extension while save is pending; reopening does not inherit cursor content, position, opacity, visibility or scale |  |
| P14-L7 | During a touch drawing gesture, a second touch cannot move, finish or cancel the initiating touch's stroke |  |

## Final acceptance

| ID | Required result | Result / evidence |
| --- | --- | --- |
| P14-X1 | Every applicable PR 13 and PR 14 row passes on the candidate commit |  |
| P14-X2 | ZIP digest is recorded and matches the artifact selected for release |  |
| P14-X3 | Reviewer name and date are recorded before tagging |  |
