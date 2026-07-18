# PR 7 manual test contract

Test this pull request in a real GNOME 50 Wayland session after rebuilding and
reloading Compact Capture. Run the automated checks first:

```sh
npm test
npm run check
```

## Interaction targets and states

1. Open area capture, drag a selection and compare every tool, colour and
   action button. Their hit areas should be equal even though the artwork stays
   at 16 logical pixels.
2. Hover, press and select each tool. Hover, active and checked states must be
   visually distinct in both the light and dark Shell styles.
3. Draw one stroke, then exercise Undo, Redo and Clear. Disabled actions must
   have no hover highlight or hint; enabled actions must restore both.
4. Move keyboard focus with `Tab` and `Shift+Tab`. The focus ring must remain
   visible on checked and unchecked controls. `Enter` and `Space` must activate
   the focused button.
5. Select Highlighter and confirm its initial width is 12, then return to a
   regular drawing tool and confirm its initial width is 3. Customize both
   widths and switch between them; each tool must restore its own slider value.

## Shared hints

1. Rest the pointer over every control and confirm its hint appears after a
   short delay.
2. Move rapidly across the toolbar. At most one hint may be visible, and an old
   hint must never appear after the pointer has moved away.
3. Leave the toolbar while a hint is pending and while it is visible. It must
   disappear without leaving a highlighted control behind.
4. Focus controls from the keyboard without hovering them. The same hints must
   appear, follow focus and disappear when the screenshot UI closes.

## Responsive placement

1. Test selections near every edge and corner of each monitor. The toolbar must
   prefer above, then below, then the monitor top, without covering native
   resize handles when outside space exists.
2. Test a very narrow selection, 100% and 200% scaling, a secondary monitor and
   mixed-scale monitors. The toolbar must remain centered on the selection when
   possible and constrained by its chosen monitor.
3. On a monitor narrower than the toolbar, verify that overflow is balanced on
   both sides rather than losing all controls past one edge.
4. Close and reopen the screenshot interface repeatedly. No tooltip, focus
   highlight or toolbar actor may survive its session.
