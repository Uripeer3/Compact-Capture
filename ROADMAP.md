# Pull request roadmap

Each pull request should remain usable as an independent review unit. The
adapter-specific work is intentionally separated from the model and renderer
that may later be proposed directly to GNOME Shell.

## PR 1 — Licensed foundation and annotation core

Status: merged.

- Establish the GPL-3.0-only project and attribution.
- Add a unique extension identity for Compact Capture.
- Add the Shell-independent annotation document and four initial tools.
- Add renderer primitives adapted from the GPL-licensed Gradia Capture code.
- Add unit tests and dependency-free CI.
- Explicitly exclude storage, clipboard, toast, OCR, Gradia integration and
  unlicensed selection-clearing code.

## PR 2 — Narrow GNOME Shell adapter

Status: merged.

- Add one version-gated module as the only owner of private ScreenshotUI access.
- Observe screenshot open/close lifecycle without changing capture behaviour.
- Use `InjectionManager` for reversible interception.
- Add deterministic enable/disable cleanup and failure rollback.
- Pass native capture through unchanged when Compact Capture is inactive.

## PR 3 — Compact, accessible toolbar

Status: implemented in this pull request.

- Add the Spectacle-inspired compact tool strip.
- Support freehand, rectangle, arrow and highlighter selection.
- Add accessible names, keyboard focus, visible state and theme-derived colours.
- Keep GNOME's native capture types, pointer toggle and screencast controls.

## PR 4 — Monitor-aware annotation overlay

- Add drawing canvases without replacing GNOME's selection UI.
- Define stage-logical, monitor-local and output-pixel coordinate conversions.
- Support mixed-scale and secondary-monitor placement.
- Add point sampling and bounded repaint work for older hardware.

## PR 5 — Native output bridge

- If the document is empty, invoke GNOME's original save path unchanged.
- If annotated, render one final texture and hand it to GNOME's native
  `captureScreenshot()` pipeline.
- Keep GNOME responsible for PNG encoding, clipboard MIME, filename, lockdown,
  notification and sound.
- Add capture-in-progress protection and error handling.

## PR 6 — Editing completeness

- Add text using Pango for both preview and output.
- Add numbered markers with one consistent numbering policy.
- Add selection, movement, undo and clear behaviour.
- Verify keyboard and input-method behaviour.

## PR 7 — Preferences, translations and compatibility

- Add only preferences that affect Compact Capture's own tools.
- Add gettext integration and RTL review.
- Add GNOME 49/50 compatibility fixtures and explicit fail-open behaviour.
- Document privacy, limitations and troubleshooting.

## PR 8 — 0.1 release hardening

- Test nested and real Fedora GNOME sessions.
- Test 100%, 200% and mixed-scale multi-monitor configurations.
- Measure long-stroke and 4K capture performance.
- Verify the extension package contents and extensions.gnome.org review rules.
- Publish the first signed source archive after manual acceptance testing.

## Path to GNOME Shell

After the extension validates the workflow, upstream work should be a new GNOME
Shell patch series. The annotation model, rendering rules, interaction design
and test cases are candidates to port. The private-field adapter, monkey patches
and extension lifecycle code are prototypes and should not be upstreamed.
