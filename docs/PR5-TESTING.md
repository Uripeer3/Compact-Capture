# PR 5 manual test plan

PR 5 includes committed annotations in GNOME's copied and saved screenshot while
leaving GNOME responsible for every destination and notification.

## Native pass-through

1. Open the screenshot UI and capture an area without drawing.
2. Confirm the clipboard image and saved PNG are unchanged and GNOME shows its
   normal sound and notification once.
3. Repeat for screen and window capture.
4. Confirm screen recording remains unchanged.

## Annotated output

1. Select an area and draw with every currently supported tool.
2. Capture with the round button, Enter and Ctrl+C in separate runs.
3. Confirm each clipboard image and saved PNG contains the same completed
   annotations shown in the preview.
4. Enable GNOME's pointer option and confirm the pointer and annotations both
   appear once in the output. Disable it and confirm the pointer is absent.
5. Repeat with Screen mode and, if available, a secondary monitor.

## Scale, cleanup and failure safety

- Repeat at 100% and 200% output scale; lines and positions must match preview.
- If available, repeat on mixed-scale monitors.
- Trigger capture once with several long strokes and confirm the UI does not
  create duplicate files or notifications.
- Close and reopen the screenshot UI after capture; the native pointer and old
  annotations must not remain.
- Disable Compact Capture and confirm GNOME's screenshot output is unchanged.
