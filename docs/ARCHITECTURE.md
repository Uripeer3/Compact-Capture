# Architecture

## Principle

Compact Capture augments GNOME's screenshot UI; it does not implement a second
screenshot service.

## Ownership boundary

GNOME Shell owns:

- modal and input-grab lifecycle;
- area, screen and window selection;
- stage, window and cursor capture;
- screen recording;
- file naming and storage;
- clipboard output and MIME types;
- lockdown policy, sound and notifications.

Compact Capture owns:

- annotation document state;
- drawing tools and undo;
- annotation overlay input;
- compact annotation controls;
- conversion of an annotated document into a final texture.

## Planned modules

- `extension.js`: small lifecycle coordinator.
- `shell/shellAdapter.js`: private GNOME access and compatibility checks.
- `core/annotationDocument.js`: pure, testable document and history model.
- `core/capturePreparation.js`: reversible input lock and atomic snapshot
  preparation.
- `core/asyncTaskGate.js`: one shared promise for concurrent native saves.
- `core/gestureSequence.js`: pointer-button and touch-sequence ownership.
- `core/keyboardShortcuts.js`: pure shortcut-to-action mapping.
- `core/annotationRenderer.js`: Cairo rendering without storage side effects.
- `core/outputPlan.js`: output-scale and cursor placement calculations.
- `core/textureCompositionPlan.js`: pure framebuffer-layer geometry and
  resource accounting.
- `core/selectionLifecycle.js`: explicit screenshot, capture and area-state
  transitions with reversible empty-selection effects.
- `core/signalConnectionSet.js`: transactional session-scoped signal rebinding
  for Shell actors that GNOME recreates.
- `shell/outputRenderer.js`: selection-sized transparent output texture.
- `shell/annotatedOutputBridge.js`: fail-open native-save handoff and cursor
  restoration.
- `ui/annotationOverlay.js`: monitor-aware pointer and touch interaction.
- `ui/annotationRenderCache.js`: scale-aware committed-stroke Cairo cache.
- `ui/compactToolbar.js`: accessible Shell UI.

GNOME-required entry files remain at the source root. Shell-independent state
and rendering live in `core/`, private integration stays isolated in `shell/`,
Shell actors live in `ui/`, and bundled symbolic artwork lives in `icons/`.

The adapter must fail open: when compatibility checks fail, GNOME's original
screenshot behaviour must continue unchanged.

## Adapter contract

`shell/shellAdapter.js` is the only module allowed to import
`Main.screenshotUI` or intercept one of its methods. The adapter and its narrow
`shell/annotatedOutputBridge.js` collaborator are the only modules allowed to
read ScreenshotUI private fields. The adapter wraps `open()` and
`_saveScreenshot()` on ScreenshotUI's direct prototype and observes the native
`closed` and
screenshot/recording mode signals. Patching the prototype allows
`InjectionManager` to restore the exact original ownership and method. The
wrapper awaits and returns the original result; it does not catch, translate or
replace native capture errors.

The adapter translates private Shell details into narrow, immutable session
data and actor operations:

- screenshot/recording, capture-type and area-selection state;
- selection and monitor geometry in stage-logical coordinates;
- selection drag lifecycle events;
- a reversible empty-selection gate for area mode;
- mounting, placing and unmounting toolbar and overlay actors.

The toolbar and extension controller never receive the ScreenshotUI object,
capture buttons or monitor bin themselves.

`core/selectionLifecycle.js` is the source of truth for whether area mode is
inactive, empty, being dragged or selected. The model records an initially
empty area even when ScreenshotUI opens directly in recording mode, but applies
the visual empty-selection gate only in screenshot mode. Returning to
screenshots therefore cannot expose GNOME's untouched default rectangle as a
completed Compact Capture selection. A region explicitly dragged while
recording remains selected when returning to screenshots.

GNOME recreates its private screen-selector actors after a monitor change.
Their signals are therefore session-scoped: the adapter disconnects them on
close and binds the current `_screenSelectors` after every successful `open()`.
Static ScreenshotUI and capture-button signals retain the adapter's full
enable/disable lifetime.

The adapter is enabled only for an explicitly supported GNOME major version and
after its required methods have been inspected. Installation is transactional:
if either method injection or signal connection fails, every completed step is
rolled back. Disabling disconnects the signal and clears `InjectionManager`.

Callbacks from Compact Capture are isolated from GNOME's open/close path so an
annotation-side exception cannot prevent the native screenshot UI from working.

## Output boundary

An empty annotation document calls GNOME's original `_saveScreenshot()` with no
intermediate work or state changes. Window capture remains on that same path.

For an annotated area or screen capture, `shell/outputRenderer.js` creates one
transparent Cairo surface sized to the selected output rather than the whole
virtual desktop. The shared renderer draws in stage-logical coordinates at the
native screenshot scale. GDK's supported `pixbuf_get_from_surface()` conversion
then supplies the RGBA pixels to a Shell image texture; the extension does not
read Cairo's private backing buffer. With the pointer disabled, that uploaded
texture is handed to GNOME directly. With the pointer enabled, a Cogl
offscreen framebuffer draws the annotation and native cursor textures into one
new texture. The cursor rectangle is calculated in output pixels and clips at
the selection boundary.

This mirrors the offscreen-texture copy used by GNOME Shell itself when it
freezes the native cursor. It performs no intermediate PNG encode and no
texture readback. GNOME's final `composite_to_stream()` call remains the only
readback and PNG encoding pass.

`paint_to_content()` is deliberately not used for annotation output. Mutter
exposes that method on `Meta.WindowActor` (and a separate variant on
`Clutter.Stage`), not on a general `St.DrawingArea`.

The output bridge temporarily exposes this final texture through the cursor
overlay arguments already consumed by GNOME's `captureScreenshot()` pipeline,
invokes the original `_saveScreenshot()`, then restores the native cursor actor
in a `finally` block. Preparation errors restore the cursor and delegate once
to unchanged GNOME capture; errors from GNOME after delegation still propagate.
GNOME therefore still owns cropping, PNG encoding, clipboard MIME data,
filename selection, lockdown policy, sound and notifications. No GNOME storage
code is copied into the extension.

Before output preparation, the extension resolves the visible draft through
its owning overlay, disables every annotation overlay and toolbar control, and
then takes one isolated snapshot. The adapter passes only that frozen snapshot
to the output renderer. Input remains disabled until the native asynchronous
save settles; its release callback is idempotent so ScreenshotUI closing or the
extension disabling during a save cannot re-enable destroyed actors.

One Shell-independent asynchronous gate owns the complete prepare, render and
native-save operation. Concurrent capture requests receive the same promise
and cannot prepare a second snapshot. The gate reopens after success or error.
A rendering or texture error is logged and fails open to an unmodified GNOME
capture, with annotation input restored only after that native fallback
settles. Errors after the native save starts retain GNOME's existing
propagation behaviour.

## Toolbar boundary

`ui/compactToolbar.js` ports Gradia Capture's toolbar interaction pattern
without its settings, drawing-canvas or controller dependencies. It owns only
Shell widgets and emits semantic tool/style/action signals.
`core/toolbarState.js` stores the selected tool, palette colour and a remembered
line width for each tool independently of Shell. Highlighter therefore retains
its wider default without changing the width of the regular drawing tools. The
state is unit-testable and survives switching temporarily into recording mode.

Undo and redo move complete strokes between session-local stacks. A
new committed stroke invalidates redo history, clear resets both stacks and an
in-progress gesture is cancelled before committed history is changed. History
does not survive closing ScreenshotUI because it has no meaning outside the
captured frame.

The toolbar is destroyed when
ScreenshotUI closes and recreated for the next native screenshot session; all
child widgets and their signal connections therefore share one deterministic
lifetime.

The adapter translates ScreenshotUI key events into Shell-independent undo and
redo actions. `Ctrl+Z` performs undo, while `Ctrl+Shift+Z` and `Ctrl+Y` perform
redo. Unhandled keys, including GNOME's capture shortcuts, propagate unchanged.
The key signal shares the adapter's existing transactional enable/disable
lifecycle. Compact Capture does not install an Escape handler; GNOME retains
that key throughout the screenshot lifecycle.

Placement is selection-aware: controls stay hidden during an area drag, prefer
the space above or below the completed selection, and use the top of the
selected monitor as the fallback.

Area mode starts with GNOME's default rectangle temporarily moved off-stage.
Its selection cutout, border and handles are hidden while GNOME's native shade
continues to dim the captured desktop. The native capture button and capture
shortcuts are gated while no area exists. The adapter restores the selector on
the first native drag, when leaving area mode, and during disable/close cleanup.
This keeps the empty state reversible and leaves GNOME's selector implementation
responsible for the actual drag, resize and geometry rules.

The immutable session snapshot includes this explicit area state. The extension
uses it instead of maintaining a second waiting-for-selection boolean, keeping
the hint, capture gate and annotation actors on the same transition path.

While area mode is empty, a non-reactive hint on the primary monitor explains
the native keyboard route: drag an area, or press `C` and then `Enter` for a
screen capture. The hint disappears synchronously when selection starts.

Every compact control retains an accessible name and has a delayed pointer or
keyboard-focus hint. One toolbar-owned tooltip actor is mounted beside the
toolbar so it can use stage coordinates without taking ownership of
ScreenshotUI. Switching controls cancels the pending hint before reusing that
actor, and destroying the toolbar disconnects all target signals and timeouts.

Tool, colour and action buttons use one 34-logical-pixel hit target. Symbolic
artwork and colour swatches remain 16 logical pixels, leaving the surrounding
space available to pointer and touch input. Hover, active, checked, keyboard
focus and insensitive styling use Shell theme colours and remain independently
visible. Placement prefers space outside the selected output and balances an
oversized toolbar across a narrow monitor rather than overflowing only one
edge.

## Overlay boundary

`ui/annotationOverlay.js` owns pointer/touch gestures and Cairo preview only.
It stores stage-logical points in the Shell-independent annotation document.
Small drawing actors cover only the selected region on each intersecting
monitor; an eight-pixel outer gutter remains available to GNOME's native resize
handles. Starting a native selection drag removes the overlays and controls,
then rebuilds them from the completed geometry.

Each gesture has one explicit input owner. Pointer gestures retain their
initiating button. Touch gestures retain the slot from the initiating
`Clutter.EventSequence`, matching GNOME's native selector; updates, ends and
cancellations from every other sequence propagate unchanged. Capture commits
a complete visible draft (or naturally drops an incomplete one-point draft),
releases its stage grab and prevents further gesture input before snapshotting.

Freehand input is sampled at a two-logical-pixel threshold and capped at 4096
points per gesture. The complete document, including undo/redo history and an
active draft, is capped at 65,536 points and 1024 strokes. A gesture that
reaches the point budget keeps replacing its final point, while a new gesture
is refused when the document cannot reserve two points.

Overlay repainting uses one revisioned, read-only document view shared by all
monitor actors. Committed strokes and points are frozen; only the active
draft's private point storage changes during pointer motion. Each overlay
rasterizes committed strokes into a Cairo image surface once per committed
revision and resource scale, then paints only the active draft on live updates.
The resource scale is read during the Clutter paint cycle and applied as the
Cairo device scale, preserving 100%, 200% and mixed-monitor sharpness. Undo,
redo, clear and scale changes invalidate the relevant cache deterministically.

The deep isolated `snapshot()` remains available only at the final output
boundary, where capture correctness matters more than a one-time allocation.
`npm run benchmark` exercises that boundary at the production point budget and
compares it with repeated shared render-view lookup. Coordinate conversion and
toolbar placement rules live in `core/geometry.js` and are covered by Node
tests, including secondary-monitor and mixed-output-scale examples.

Window annotation remains deliberately absent. The output bridge intercepts
only `_saveScreenshot()` and always delegates storage to its original method.

## Deliberate exclusions

Version 0.1 will add pixelate and blur but will not provide text, numbered
markers, selecting and moving existing annotations, alternate image formats,
Save As, custom storage, custom notifications, OCR or external-editor
integration. These require additional interaction design or ownership beyond
the compact workflow being validated.

Pixelate and blur are visual obscuring tools, not secure redaction. That
distinction must remain visible in documentation and user-facing guidance.
