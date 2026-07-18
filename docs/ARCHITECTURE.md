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
- `core/keyboardShortcuts.js`: pure shortcut-to-action mapping.
- `core/annotationRenderer.js`: Cairo rendering without storage side effects.
- `core/outputPlan.js`: output-scale and cursor placement calculations.
- `shell/outputRenderer.js`: selection-sized transparent output texture.
- `ui/annotationOverlay.js`: monitor-aware pointer and touch interaction.
- `ui/compactToolbar.js`: accessible Shell UI.

GNOME-required entry files remain at the source root. Shell-independent state
and rendering live in `core/`, private integration stays isolated in `shell/`,
Shell actors live in `ui/`, and bundled symbolic artwork lives in `icons/`.

The adapter must fail open: when compatibility checks fail, GNOME's original
screenshot behaviour must continue unchanged.

## Adapter contract

`shell/shellAdapter.js` is the only module allowed to import
`Main.screenshotUI`, read one of its private fields or intercept one of its
methods. It wraps `open()` and `_saveScreenshot()` on ScreenshotUI's direct
prototype and observes the native `closed` and
screenshot/recording mode signals. Patching the prototype allows
`InjectionManager` to restore the exact original ownership and method. The
wrapper awaits and returns the original result; it does not catch, translate or
replace native capture errors.

The adapter translates private Shell details into narrow, immutable session
data and actor operations:

- screenshot/recording and capture-type state;
- selection and monitor geometry in stage-logical coordinates;
- selection drag lifecycle events;
- a reversible empty-selection gate for area mode;
- mounting, placing and unmounting toolbar and overlay actors.

The toolbar and extension controller never receive the ScreenshotUI object,
capture buttons or monitor bin themselves.

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
read Cairo's private backing buffer. If GNOME's pointer option is active, the
native cursor is folded into that texture first.

`paint_to_content()` is deliberately not used for annotation output. Mutter
exposes that method on `Meta.WindowActor` (and a separate variant on
`Clutter.Stage`), not on a general `St.DrawingArea`.

The adapter temporarily exposes this final texture through the cursor overlay
arguments already consumed by GNOME's `captureScreenshot()` pipeline, invokes
the original `_saveScreenshot()`, then restores the native cursor actor in a
`finally` block. GNOME therefore still owns cropping, PNG encoding, clipboard
MIME data, filename selection, lockdown policy, sound and notifications. No
GNOME storage code is copied into the extension.

Only one annotated capture may prepare output at a time. A rendering or texture
error is logged and fails open to an unmodified GNOME capture; errors after the
native save starts retain GNOME's existing propagation behaviour.

## Toolbar boundary

`ui/compactToolbar.js` ports Gradia Capture's toolbar interaction pattern
without its settings, drawing-canvas or controller dependencies. It owns only
Shell widgets and emits semantic tool/style/action signals.
`core/toolbarState.js` stores the selected tool, palette colour and line width
independently of Shell so the state is unit-testable and survives switching
temporarily into recording mode.

Undo and redo move complete strokes between session-local stacks. A
new committed stroke invalidates redo history, clear resets both stacks and an
in-progress gesture is cancelled before committed history is changed. History
does not survive closing ScreenshotUI because it has no meaning outside the
captured frame.

The toolbar is destroyed when
ScreenshotUI closes and recreated for the next native screenshot session; all
child widgets and their signal connections therefore share one deterministic
lifetime.

The adapter translates ScreenshotUI key events into Shell-independent editing
actions. `Ctrl+Z` performs undo, `Ctrl+Shift+Z` and `Ctrl+Y` perform redo, and
`Esc` is consumed only to cancel an active drawing gesture. Unhandled keys,
including GNOME's capture shortcuts, propagate unchanged. The key signal shares
the adapter's existing transactional enable/disable lifecycle.

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

While area mode is empty, a non-reactive hint on the primary monitor explains
the native keyboard route: drag an area, or press `C` and then `Enter` for a
screen capture. The hint disappears synchronously when selection starts.

Every compact control retains an accessible name and has a delayed hover hint.
Tooltip actors are mounted beside the toolbar so they can use monitor-local
coordinates without taking ownership of ScreenshotUI. They are cancelled and
destroyed with the toolbar, including when a hint is still waiting to open.

## Overlay boundary

`ui/annotationOverlay.js` owns pointer/touch gestures and Cairo preview only.
It stores stage-logical points in the Shell-independent annotation document.
Small drawing actors cover only the selected region on each intersecting
monitor; an eight-pixel outer gutter remains available to GNOME's native resize
handles. Starting a native selection drag removes the overlays and controls,
then rebuilds them from the completed geometry.

Freehand input is sampled at a two-logical-pixel threshold and capped at 4096
points per gesture. Repaint requests are coalesced by Clutter, and rendering
work therefore remains bounded even on long strokes. Coordinate conversion and
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
