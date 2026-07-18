# Pull request roadmap

Compact Capture is an experimental extension and an upstream design prototype.
Each pull request must remain independently reviewable, leave GNOME's native
capture path usable and include tests for new Shell-independent behaviour.

Manual acceptance is tracked in the
[cumulative test checklist](docs/CUMULATIVE-TEST-CHECKLIST.md). Starting with
PR 13, each PR-specific test contract must reference that checklist, add its
new coverage there and carry forward unresolved applicable rows. Historical
results remain tied to the commit and environment that produced them; a code
fix does not become a manual Pass until the affected row is rerun.

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
freehand, rectangle, arrow and highlighter. Pixelate, blur, text, numbered
markers, object selection and external export integrations are deferred.

### PR 6 — Editing history and project contract

Status: merged.

- Add redo with deterministic history invalidation.
- Add conventional undo/redo shortcuts without intercepting unrelated GNOME
  keys.
- Make shortcut and signal cleanup follow the screenshot UI lifecycle.
- Record the approved v0.1 design, scope and manual test contract.

### PR 7 — GNOME visual and accessibility polish

Status: merged.

- Implement the approved compact spacing and state treatment from the design
  specification.
- Give every button the same compact hit target and verify symbolic icons,
  contrast, keyboard focus, checked and insensitive states.
- Replace the per-control tooltip actors with one toolbar-owned tooltip
  controller, including keyboard-focus hints and rapid-transition tests.
- Keep the toolbar outside the selected output whenever monitor space permits,
  with balanced fallback placement on narrow monitors.
- Apply and remember each tool's own line-width default.

### PR 8 — Bounded live rendering

Status: merged.

- Remove deep document snapshots and avoidable point-array allocations from
  the pointer-motion repaint path.
- Share immutable render views and cache committed drawing work across overlay
  repaints.
- Enforce a benchmark-backed session-wide stroke and point budget.
- Add allocation, budget and multi-monitor performance coverage before adding
  more expensive tools.

### PR 9 — Selection lifecycle correctness

Status: merged.

- Model screenshot mode, capture type and empty-area state as explicit
  lifecycle transitions.
- Reconcile empty-area state when ScreenshotUI opens directly in recording
  mode and later returns to screenshot mode.
- Rebind dynamically recreated screen-selector actors for every session.
- Extract and unit-test selection lifecycle rules while keeping private
  ScreenshotUI access inside the adapter.

### PR 10 — Atomic capture and input ownership

Status: merged.

- Commit or cancel the visible draft before freezing one output snapshot.
- Disable annotation input for the duration of native asynchronous capture and
  restore it if preparation fails.
- Associate touch gestures with their initiating Clutter event sequence.
- Cover concurrent capture requests, failure recovery and unrelated touch
  sequences.

### PR 11 — Cursor and output-bridge performance

Status: merged.

- Replace the otherwise-unused PNG encoding pass in cursor composition with a
  supported raw-texture, Cairo or Cogl route.
- Measure pointer-on and pointer-off capture time and memory at 4K and 200%
  scaling while preserving output parity.
- Extract annotated-output interception and cursor restoration from the main
  adapter behind a narrow, fail-open interface.
- Make empty-selection actor effects transactional and teardown best-effort so
  private actor failures cannot strand the lifecycle model or abort cleanup.
- Let divergent edits reclaim redo capacity and replace full stroke-array
  copies with persistent read-only history views.
- Retain committed Cairo surfaces, append new strokes directly and repaint only
  dirty bounds for undo before future source-dependent tools increase rendering
  cost.
- Align dirty clips outward to cache device pixels and regression-test
  translucent undo/redo with real Cairo at 100% and 200% scale.
- Require real-session output, alpha, cursor-edge and 4K performance results in
  `docs/PR11-TESTING.md`; structural Node tests are not treated as pixel proof.

### PR 12 — Pixelate and blur

Status: closed without merge; deferred to Version 0.2.

- The prototype established useful rendering, performance and test constraints
  but also showed that the toolbar model and editing interaction need a design
  checkpoint before the source-dependent backend becomes part of v0.1.
- Preserve the experiment in its branch rather than carrying unused backend
  code into the release.
- Continue the feature under the independently reviewable Obscure work in the
  [Version 0.2 roadmap](docs/v2_roadmap.md).

### PR 13 — Translations and compatibility

Status: in progress.

- Add gettext integration and RTL review.
- Add explicit supported-version fixtures and fail-open compatibility checks.
- Document privacy behaviour, limitations and troubleshooting.
- Reconcile the v0.1 design and release contract after deferring Pixelate and
  Blur to v0.2.

### PR 14 — 0.1 release hardening

- Test real Fedora GNOME sessions at 100%, 200% and mixed monitor scales.
- Measure long-stroke and 4K capture performance.
- Verify package contents and extensions.gnome.org review requirements.
- Publish the 0.1 source archive after manual acceptance testing.

## After 0.1

Version 0.2 will validate lightweight object editing and prepare the annotation
architecture for a native GNOME Shell patch series. Its independently
reviewable PR chain and explicit exclusions are recorded in the
[Version 0.2 roadmap](docs/v2_roadmap.md).

## Path to GNOME Shell

After the extension validates the workflow, upstream work should become a new
GNOME Shell patch series rather than an extension merge. Port the validated
model, rendering rules, interaction design and tests. Do not upstream the
private-field adapter, method injection or extension lifecycle scaffolding.
