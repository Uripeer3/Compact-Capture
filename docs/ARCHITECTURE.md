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
- `shellAdapter.js`: all GNOME private API access and compatibility checks.
- `annotationDocument.js`: pure, testable state model.
- `annotationRenderer.js`: Cairo rendering without storage side effects.
- `annotationOverlay.js`: monitor-aware pointer and keyboard interaction.
- `compactToolbar.js`: accessible Shell UI.

The adapter must fail open: when compatibility checks fail, GNOME's original
screenshot behaviour must continue unchanged.

## Deliberate exclusions

Version 0.1 will not provide alternate image formats, Save As, custom storage,
custom notifications, OCR or external-editor integration. These require taking
ownership away from GNOME and would obscure whether the compact annotation
workflow itself is successful.

