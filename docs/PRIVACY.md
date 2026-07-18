# Privacy and data handling

Compact Capture runs inside GNOME Shell and augments GNOME's existing
screenshot interface. It does not provide a separate capture or storage
service.

## Data flow

- GNOME captures the selected area or screen and supplies the captured image
  content used for preview and final composition.
- Compact Capture keeps the current annotation document in GNOME Shell memory
  for the active screenshot session.
- When annotations exist, Compact Capture creates a selection-sized transparent
  annotation texture and hands it back to GNOME's native save path.
- GNOME remains responsible for clipboard contents, filenames, file storage,
  lockdown policy, notifications and screenshot sound.
- Closing the screenshot UI, changing capture mode or disabling the extension
  clears the in-memory annotation document and removes its actors.

Compact Capture has no network access, telemetry, subprocesses, custom file
store, clipboard history, cloud integration or third-party runtime dependency.
It does not scan screenshot text or retain a separate copy of the captured
image.

## Limitations

- The extension supports only the GNOME Shell versions listed in
  `metadata.json`; the private ScreenshotUI adapter disables itself when its
  compatibility contract is not met.
- Area and screen capture support annotations. Window capture and recording
  continue through GNOME unchanged.
- An annotation changes the final screenshot pixels but does not modify or
  remove information from other screenshots, clipboard history, backups or
  earlier workflow states.
- Pixelate and Blur are deferred to Version 0.2. If added, they will be
  documented as visual obscuring rather than secure redaction.
- Compact Capture is a workflow prototype, not a security or privacy boundary.

For installation and failure diagnostics, see
[TROUBLESHOOTING.md](TROUBLESHOOTING.md).
