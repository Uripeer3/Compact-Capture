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
- `core/annotationDocument.js`: pure, testable state model.
- `core/annotationRenderer.js`: Cairo rendering without storage side effects.
- `ui/annotationOverlay.js`: monitor-aware pointer and keyboard interaction.
- `ui/compactToolbar.js`: accessible Shell UI.

GNOME-required entry files remain at the source root. Shell-independent state
and rendering live in `core/`, private integration stays isolated in `shell/`,
Shell actors live in `ui/`, and bundled symbolic artwork lives in `icons/`.

The adapter must fail open: when compatibility checks fail, GNOME's original
screenshot behaviour must continue unchanged.

## Adapter contract

`shell/shellAdapter.js` is the only module allowed to import
`Main.screenshotUI`, read one of its private fields or intercept one of its
methods. It wraps only `open()` on ScreenshotUI's direct prototype and observes
the native `closed` and
screenshot/recording mode signals. Patching the prototype allows
`InjectionManager` to restore the exact original ownership and method. The
wrapper awaits and returns the original result; it does not catch, translate or
replace native capture errors.

The adapter translates private Shell details into two narrow operations:

- a high-level `isScreenshot` session flag;
- mounting or unmounting one actor in the primary monitor bin.

The toolbar and extension controller never receive the ScreenshotUI object,
capture buttons or monitor bin themselves.

The adapter is enabled only for an explicitly supported GNOME major version and
after its required methods have been inspected. Installation is transactional:
if either method injection or signal connection fails, every completed step is
rolled back. Disabling disconnects the signal and clears `InjectionManager`.

Callbacks from Compact Capture are isolated from GNOME's open/close path so an
annotation-side exception cannot prevent the native screenshot UI from working.

## Toolbar boundary

`ui/compactToolbar.js` ports Gradia Capture's toolbar interaction pattern
without its settings, drawing-canvas or controller dependencies. It owns only
Shell widgets and emits semantic tool/style/action signals.
`core/toolbarState.js` stores the selected tool, palette colour and line width
independently of Shell so the state is unit-testable and survives switching
temporarily into recording mode.

Undo and clear are present but insensitive until PR 4 adds annotations. The
toolbar is destroyed when ScreenshotUI closes and recreated for the next native
screenshot session; all child widgets and their signal connections therefore
share one deterministic lifetime.

PR 3 anchors the toolbar to the top of the primary monitor so it cannot cover
the centre of GNOME's initial area selection. PR 4 will make placement
selection-aware: hide controls during an area drag, prefer the space above or
below the completed selection, and use the top of the selected monitor as the
fallback.

Every compact control retains an accessible name and has a delayed hover hint.
Tooltip actors are mounted beside the toolbar so they can use monitor-local
coordinates without taking ownership of ScreenshotUI. They are cancelled and
destroyed with the toolbar, including when a hint is still waiting to open.

## Deliberate exclusions

Version 0.1 will not provide alternate image formats, Save As, custom storage,
custom notifications, OCR or external-editor integration. These require taking
ownership away from GNOME and would obscure whether the compact annotation
workflow itself is successful.
