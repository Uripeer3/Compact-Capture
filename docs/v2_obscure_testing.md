# Version 0.2 Obscure acceptance contract

This checklist applies when Pixelate and Blur return in Version 0.2. It records
the useful acceptance constraints learned from the unmerged PR 12 prototype
without making its UI or backend part of Version 0.1.

## Design gate

| Test | Required result |
| --- | --- |
| Tool model | Compare one Obscure tool plus treatment control with separate Pixelate and Blur tools in the live GNOME screenshot UI. Approve one before implementation. |
| Context controls | Effect-only controls appear only when relevant and do not make the inactive toolbar wider or harder to scan. |
| Editing | Creation, selection, resize, cancellation and capture-during-editing have explicit states shared with other annotation objects. |
| Accessibility | Every control has a localized accessible name, hover hint, keyboard focus and distinct checked/insensitive states. |

## Preview and output parity

Run every applicable row with Pixelate and Blur, weak and strong intensity, an
edge-clipped region, overlapping ordinary annotations and a resized region.

| Scale | Capture | Pointer |
| ---: | --- | --- |
| 100% | Area | Off and on |
| 100% | Screen | Off and on |
| 200% | Area | Off and on |
| 200% | Screen | Off and on |
| Mixed | Area spanning monitors | Off and on |

For each row, live preview, clipboard pixels and saved PNG pixels must match at
the affected bounds. Check device-pixel edges, translucent highlighter overlap,
cursor edges and composition order.

## Performance and lifecycle

- Dragging an outline must not resample source pixels on every pointer event.
- Repeated create, resize, undo, redo and clear operations must keep Shell
  responsive and release invalidated effect textures.
- Record CPU time and peak memory for maximum allowed affected area at 4K/200%
  on the oldest available test hardware.
- Closing, changing capture type, changing monitors and disabling the extension
  must remove every effect actor and restore GNOME's native screenshot state.
- A preview or output failure must preserve GNOME's unmodified capture path and
  emit one useful diagnostic rather than an event-loop log flood.

## Privacy wording

The toolbar, README and release notes must call these visual-obscuring effects.
They must not promise irreversible removal, recovery resistance or secure
redaction.
