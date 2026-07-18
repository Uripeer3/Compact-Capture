# Version 0.2 roadmap — Editable annotations and upstream preparation

Version 0.2 will validate lightweight object editing and source-dependent
Obscure tools while keeping Compact Capture aligned with GNOME Shell's native
screenshot workflow. It will adopt the useful parts of Spectacle's annotation
architecture—stable annotation objects, bounds-based repainting and atomic
editing—without adding a separate viewer, export system or storage workflow.

Pixelate and Blur moved here after the PR 12 prototype demonstrated that their
backend cost is coupled to unresolved toolbar and editing decisions. Their UI
must therefore pass a design checkpoint before implementation resumes.

## PR 15 — Typed annotation objects

- Replace the stroke-only internal representation with stable annotation IDs,
  tool-specific geometry and calculated render bounds.
- Preserve v0.1 appearance, history behaviour and saved-output parity.
- Keep immutable render views and the existing document-wide resource limits.
- Add migration and output-parity tests for every v0.1 tool.

## PR 16 — ID-indexed editing damage

- Extend the v0.1 append/undo/redo dirty-region cache to object edits by
  tracking both the previous and current bounds of each stable annotation ID.
- Union old and new bounds for move, resize and style changes, then repaint only
  annotations intersecting that damage.
- Add an ID-indexed spatial lookup only if measurements show the bounded linear
  intersection pass is insufficient.
- Preserve the existing separate committed and active-draft rendering paths.
- Measure CPU time and cache memory at 100%, 200% and mixed monitor scales.

## PR 17 — Selection, hit testing and deletion

- Add a compact Select tool for choosing an existing annotation.
- Implement deterministic hit testing using annotation geometry and visual
  bounds rather than rendered pixel inspection.
- Show a restrained GNOME-style selection outline without obscuring native
  screenshot handles.
- Support deselection and deletion as undoable document transitions.
- Provide keyboard, pointer and single-touch coverage.

## PR 18 — Move and resize annotations

- Allow selected annotations to be moved.
- Add resize handles only to tools whose geometry supports resizing.
- Treat one complete drag as one atomic undo/redo operation.
- Keep annotations clipped to the captured canvas and preserve their appearance
  across output scales.
- Reuse the dirty-region renderer for interactive editing.

## PR 19 — Pixelate and blur

### Design checkpoint

- Compare one Obscure tool with a treatment chooser against two directly
  selectable Pixelate and Blur tools. Do not start the rendering PR until the
  faster, clearer toolbar interaction is approved in a real screenshot flow.
- Decide whether intensity is a persistent slider, a small set of presets or a
  post-selection control; keep the inactive toolbar free of effect-only UI.
- Define creation, selection, resize, cancel and keyboard-focus states using the
  shared object-editing model from PRs 15–18 instead of a tool-specific gesture.
- Keep controls compact, theme-derived and consistent with GNOME's accessible
  name, hover-hint, focus, checked and insensitive states.

### Rendering and resource contract

- Treat Pixelate and Blur as source-dependent rectangular annotations; do not
  duplicate GNOME's capture, clipboard, storage or notification paths.
- Drive live preview, saved PNG and clipboard output from the same clipped
  device-pixel sampling plan.
- Generate effect textures only after a committed document transition; pointer
  motion may update an outline but must not allocate or resample a texture on
  every event.
- Bound cumulative affected area, downsampled texture memory and capture-time
  allocations. Record the limits in code and benchmark them on older hardware.
- Keep ordinary Cairo annotations cached separately and preserve deterministic
  composition order with translucent highlighters and the native cursor.
- Treat one completed resize or effect change as one atomic undo/redo action.

### Privacy and acceptance

- Describe both effects as visual obscuring, never secure redaction. Source
  pixels may remain recoverable from other files, clipboard history or earlier
  workflow states.
- Complete the focused design, parity, scale, cursor, lifecycle and performance
  matrix in [OBSCURE-TESTING.md](OBSCURE-TESTING.md) before merge.

## PR 20 — Line and ellipse tools

- Add line and ellipse as lightweight geometry variants using the existing
  colour and width controls.
- Use symbolic GNOME-style icons and the same compact hit targets as existing
  tools.
- Share rendering, history and selection behaviour with rectangle and arrow.
- Verify preview, clipboard and saved-output parity.

## PR 21 — Minimal text annotations

- Add plain text annotations using GNOME's default interface font.
- Provide restrained text-size choices and the existing colour palette rather
  than a full font-selection interface.
- Define explicit create, edit, commit and cancel states.
- Support multiline text, input methods, RTL text and accessible focus.
- Keep text editing atomic in undo/redo history.

## PR 22 — Numbered markers

- Add compact auto-incrementing numbered markers.
- Reset numbering for each screenshot session.
- Allow an existing marker's number and position to be edited.
- Keep marker contrast readable across light and dark screenshot content.
- Include marker changes in the same object history and output pipeline.

## PR 23 — Editing accessibility and input hardening

- Add keyboard traversal between selected annotations and resize handles.
- Give selection, movement, deletion and text editing clear accessible names
  and state announcements.
- Verify pointer, touch, keyboard and input-method ownership.
- Test rapid tool switching, capture during editing and cancellation paths.
- Ensure GNOME retains ownership of global screenshot shortcuts and Escape
  outside an active text-editing operation.

## PR 24 — Native GNOME integration boundary

- Separate reusable annotation controller behaviour from extension-only actor
  mounting and private ScreenshotUI interception.
- Document which modules should be ported, reimplemented or discarded in a
  GNOME Shell patch series.
- Define a native integration seam for captured image content, selection
  geometry, annotation preview and final compositing.
- Add state-transition fixtures matching GNOME Shell's native ScreenshotUI.
- Introduce no additional private GNOME API dependencies.

## PR 25 — Version 0.2 release hardening

- Test creation and editing of every annotation type on real Fedora GNOME
  sessions at 100%, 200% and mixed scaling.
- Benchmark long histories, dirty-region updates, text input and large Obscure
  regions on older hardware.
- Verify extension teardown, monitor changes, clipboard output and saved output.
- Update design, architecture, privacy and contributor documentation.
- Publish the v0.2 source archive after manual acceptance testing.

## Version 0.2 exclusions

Version 0.2 will not add a separate screenshot viewer, custom storage, Save As,
alternate image formats, OCR, external-editor integration, secure-redaction
claims or custom notifications. Window annotation remains deferred to native
GNOME integration rather than adding another fragile extension-only
ScreenshotUI hook.

Compact Capture remains a GNOME Shell workflow prototype. The extension adapter
and private-method interception are not intended for upstreaming.
