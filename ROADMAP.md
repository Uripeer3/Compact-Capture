# Pull request roadmap

Compact Capture is an experimental extension and an upstream design prototype.
Each pull request must remain independently reviewable, leave GNOME's native
capture path usable and include tests for new Shell-independent behaviour.

The private ScreenshotUI adapter and extension lifecycle are prototype code.
The annotation model, rendering rules, interaction design and tests are the
parts intended to inform a later GNOME Shell patch series.

## Completed foundation

### PR 1 — Licensed foundation and annotation core

Status: merged.

- Established the GPL-3.0-only project and provenance record.
- Added a Shell-independent annotation document and four drawing tools.
- Kept storage, clipboard, OCR and external-editor integration out of scope.

### PR 2 — Narrow GNOME Shell adapter

Status: merged.

- Isolated private ScreenshotUI access behind one version-gated adapter.
- Added reversible interception, deterministic cleanup and fail-open behaviour.
- Kept GNOME's original capture path unchanged while annotations are inactive.

### PR 3 — Compact, accessible toolbar

Status: merged.

- Added the compact tool strip and recognizable symbolic artwork.
- Added accessible names, hover hints, keyboard focus and theme-derived colours.
- Preserved GNOME's capture modes, pointer toggle and recording controls.

### PR 4 — Monitor-aware annotation overlay

Status: merged.

- Added selection-first area capture and monitor-aware drawing overlays.
- Kept controls hidden during selection and placed them beside the result.
- Added explicit coordinate conversions and bounded long-stroke work.

### PR 5 — Native output bridge

Status: merged.

- Composited annotated output into GNOME's native save and clipboard pipeline.
- Kept empty documents, window capture and screen recording fully native.
- Avoided private Cairo buffers and unsupported actor capture methods.

## Version 0.1

Version 0.1 validates a fast capture-and-mark-up workflow. Its drawing tools are
freehand, rectangle, arrow, highlighter, pixelate and blur. Text, numbered
markers, object selection and external export integrations are deferred.

### PR 6 — Editing history and project contract

Status: merged.

- Add redo with deterministic history invalidation.
- Add conventional undo/redo shortcuts without intercepting unrelated GNOME
  keys.
- Make shortcut and signal cleanup follow the screenshot UI lifecycle.
- Record the approved v0.1 design, scope and manual test contract.

### PR 7 — GNOME visual and accessibility polish

Status: in progress.

- Implement the approved compact spacing and state treatment from the design
  specification.
- Give every button the same compact hit target and verify symbolic icons,
  contrast, keyboard focus, checked and insensitive states.
- Replace the per-control tooltip actors with one toolbar-owned tooltip
  controller, including keyboard-focus hints and rapid-transition tests.
- Keep the toolbar outside the selected output whenever monitor space permits,
  with balanced fallback placement on narrow monitors.

### PR 8 — Pixelate and blur

- Add one Obscure tool with Pixelate as its default treatment and Blur as the
  alternative.
- Add rectangular obscure regions, resizing and an intensity control.
- Guarantee preview, saved PNG and clipboard parity.
- Bound preview and output work for large regions and older hardware.
- Explain that visual obscuring is not a substitute for secure redaction.

### PR 9 — Translations and compatibility

- Add gettext integration and RTL review.
- Add explicit supported-version fixtures and fail-open compatibility checks.
- Document privacy behaviour, limitations and troubleshooting.

### PR 10 — 0.1 release hardening

- Test real Fedora GNOME sessions at 100%, 200% and mixed monitor scales.
- Measure long-stroke, large obscure-region and 4K capture performance.
- Verify package contents and extensions.gnome.org review requirements.
- Publish the 0.1 source archive after manual acceptance testing.

## After 0.1

Candidate follow-up work includes text, numbered markers, selecting and moving
existing annotations, window annotations and optional export integrations.
These features require separate design review and are not release blockers.

## Path to GNOME Shell

After the extension validates the workflow, upstream work should become a new
GNOME Shell patch series rather than an extension merge. Port the validated
model, rendering rules, interaction design and tests. Do not upstream the
private-field adapter, method injection or extension lifecycle scaffolding.
