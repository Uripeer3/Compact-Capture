# Version 0.2 roadmap — Editable annotations and upstream preparation

Version 0.2 will validate lightweight object editing while keeping Compact
Capture aligned with GNOME Shell's native screenshot workflow. It will adopt
the useful parts of Spectacle's annotation architecture—stable annotation
objects, bounds-based repainting and atomic editing—without adding a separate
viewer, export system or storage workflow.

## PR 15 — Typed annotation objects

- Replace the stroke-only internal representation with stable annotation IDs,
  tool-specific geometry and calculated render bounds.
- Preserve v0.1 appearance, history behaviour and saved-output parity.
- Move Obscure geometry from a tool-specific special case into the shared
  annotation model.
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

## PR 19 — Line and ellipse tools

- Add line and ellipse as lightweight geometry variants using the existing
  colour and width controls.
- Use symbolic GNOME-style icons and the same compact hit targets as existing
  tools.
- Share rendering, history and selection behaviour with rectangle and arrow.
- Verify preview, clipboard and saved-output parity.

## PR 20 — Minimal text annotations

- Add plain text annotations using GNOME's default interface font.
- Provide restrained text-size choices and the existing colour palette rather
  than a full font-selection interface.
- Define explicit create, edit, commit and cancel states.
- Support multiline text, input methods, RTL text and accessible focus.
- Keep text editing atomic in undo/redo history.

## PR 21 — Numbered markers

- Add compact auto-incrementing numbered markers.
- Reset numbering for each screenshot session.
- Allow an existing marker's number and position to be edited.
- Keep marker contrast readable across light and dark screenshot content.
- Include marker changes in the same object history and output pipeline.

## PR 22 — Editing accessibility and input hardening

- Add keyboard traversal between selected annotations and resize handles.
- Give selection, movement, deletion and text editing clear accessible names
  and state announcements.
- Verify pointer, touch, keyboard and input-method ownership.
- Test rapid tool switching, capture during editing and cancellation paths.
- Ensure GNOME retains ownership of global screenshot shortcuts and Escape
  outside an active text-editing operation.

## PR 23 — Native GNOME integration boundary

- Separate reusable annotation controller behaviour from extension-only actor
  mounting and private ScreenshotUI interception.
- Document which modules should be ported, reimplemented or discarded in a
  GNOME Shell patch series.
- Define a native integration seam for captured image content, selection
  geometry, annotation preview and final compositing.
- Add state-transition fixtures matching GNOME Shell's native ScreenshotUI.
- Introduce no additional private GNOME API dependencies.

## PR 24 — Version 0.2 release hardening

- Test creation and editing of every annotation type on real Fedora GNOME
  sessions at 100%, 200% and mixed scaling.
- Benchmark long histories, dirty-region updates, text input and large obscure
  regions on older hardware.
- Verify extension teardown, monitor changes, clipboard output and saved output.
- Update design, architecture, privacy and contributor documentation.
- Publish the v0.2 source archive after manual acceptance testing.

## Version 0.2 exclusions

Version 0.2 will not add a separate screenshot viewer, custom storage, Save As,
alternate image formats, OCR, external-editor integration or custom
notifications. Window annotation remains deferred to native GNOME integration
rather than adding another fragile extension-only ScreenshotUI hook.

Compact Capture remains a GNOME Shell workflow prototype. The extension adapter
and private-method interception are not intended for upstreaming.
