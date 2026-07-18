# PR 11 manual test checklist

PR 11 is not manually accepted until every required row below is marked Pass
on a real GNOME 50 session. Record failures with the journal excerpt and the
exact action that produced them. Node tests validate plans and state changes;
they do not execute GNOME's Cairo, Cogl or private actor paths.

## Test environment

| Field | Value |
| --- | --- |
| Fedora version |  |
| GNOME Shell / Mutter |  |
| Session (Wayland/X11) |  |
| GPU / driver |  |
| Monitors and scale |  |
| PR commit |  |

## Build and install

Run:

```sh
npm test
npm run check
npm run benchmark
./build.sh
gnome-extensions install --force \
  dist/compact-capture@uripeer3.github.io.shell-extension.zip
```

After replacing extension JavaScript, start a fresh GNOME session before
testing. Then enable Compact Capture and keep this journal command available:

```sh
journalctl --user -b -o cat |
  grep -E 'Compact Capture|JS ERROR|Gjs-Message' |
  tail -100
```

| Check | Expected result | Result / notes |
| --- | --- | --- |
| Automated commands | Tests, syntax check, benchmark and build pass |  |
| Extension enable | Compact Capture enables without a compatibility error |  |
| Baseline journal | No new Compact Capture or JavaScript error |  |

## Native selection lifecycle

| Check | Expected result | Result / notes |
| --- | --- | --- |
| Open area screenshot | Desktop remains shaded; hint is visible; no default selection rectangle or toolbar appears |  |
| Empty capture gate | `Enter`, `Space` and `Ctrl+C` do not capture before an area exists |  |
| First drag | Native border and handles appear; hint disappears; toolbar appears outside the selection |  |
| Recording-first route | Open in recording mode, select Area, then switch to Screenshot; the empty shaded state appears instead of GNOME's default rectangle |  |
| Mode round trip | Switch Area → Screen → Area and Screenshot → Recording → Screenshot; empty/selected state remains consistent |  |
| Monitor replacement | Close ScreenshotUI, change the monitor layout, reopen, choose each screen; toolbar and overlay follow the current screen selector |  |
| Disable while open | Disable the extension; GNOME's selector, handles and capture button return to native behaviour |  |

## Drawing, history and incremental cache

Use freehand, rectangle, arrow and highlighter strokes that overlap each other
and cross the selected monitor's centre. Include strokes near all four edges.

| Check | Expected result | Result / notes |
| --- | --- | --- |
| Tool parity | Each preview matches its icon and no committed mark changes after pointer release |  |
| Highlighter alpha | Overlaps remain translucent and retain the same colour/alpha after undo and redo |  |
| Rapid commits | Draw at least 50 short shapes quickly; Shell stays responsive and no mark disappears |  |
| Undo dirty region | Undo 10 times; removed marks vanish completely with no holes or ghosts in overlapping marks |  |
| Redo append | Redo 5 times; restored marks match their original order and appearance |  |
| Divergent edit | Undo once, draw a replacement, then try redo; drawing succeeds and redo is unavailable |  |
| Clear | Clear removes every mark without recreating the toolbar or selection |  |
| Scale/cache reset | Repeat at 100% and 200%, including a mixed-scale monitor if available; strokes stay sharp and correctly placed |  |

## Saved and copied output matrix

At both 100% and 200%, repeat Area and Screen capture with GNOME's pointer
switch off and on. For each row, capture once with `Ctrl+C`, once with `Enter`
and once with GNOME's capture button. Inspect the clipboard image and saved PNG
at 100% zoom.

| Scale | Capture | Pointer | Expected | Result / notes |
| ---: | --- | --- | --- | --- |
| 100% | Area | Off | Preview, clipboard and PNG match |  |
| 100% | Area | On | Match; pointer appears exactly once |  |
| 100% | Screen | Off | Preview, clipboard and PNG match |  |
| 100% | Screen | On | Match; pointer appears exactly once |  |
| 200% | Area | Off | Match with sharp, correctly scaled marks |  |
| 200% | Area | On | Match; pointer edge remains antialiased |  |
| 200% | Screen | Off | Match with sharp, correctly scaled marks |  |
| 200% | Screen | On | Match; pointer edge remains antialiased |  |

For pointer-on Area captures, also place the pointer fully inside, partially
across each selection edge, and fully outside. Edge pixels must clip cleanly;
they must not wrap, duplicate, shift or scale incorrectly. Closely inspect a
translucent highlighter over a solid annotation. This is the required real-pixel
check for Cogl blending and premultiplied alpha.

## Failure and teardown

The automated controller and output-bridge tests inject entry, reset, render
and native-save failures. Manually verify the real actor lifetime:

| Check | Expected result | Result / notes |
| --- | --- | --- |
| Close with annotations | Reopening starts a clean document and native empty-area state |  |
| Disable after selection | No toolbar/overlay remains and GNOME capture still works |  |
| Capture then close quickly | Reopen successfully; cursor visibility, position and scale remain native |  |
| Repeated enable/disable | Five cycles produce no stuck shade, hidden handle, inactive capture button or journal error |  |

## 4K/200% performance record

Use a 3840 × 2160 output from a 1920 × 1080 logical monitor at 200%. Draw at
least 50 mixed annotations, warm up once, then record ten pointer-off and ten
pointer-on captures for both the parent commit and PR 11. Keep other Shell
activity out of each run.

Record end-to-end time from capture activation to notification. Sample GNOME
Shell resident memory immediately before and after each capture:

```sh
shell_pid="$(pidof gnome-shell)"
ps -o rss= -p "$shell_pid"
```

| Build | Pointer | Median capture time | Largest RSS increase |
| --- | --- | ---: | ---: |
| Parent commit | Off |  |  |
| Parent commit | On |  |  |
| PR 11 | Off |  |  |
| PR 11 | On |  |  |

Acceptance requires no obvious interaction stall during rapid commits and no
material pointer-on regression versus the parent. The source path contains no
intermediate cursor PNG encode or texture readback before GNOME's one final
native encode, but only this real-session measurement validates the practical
cost.

## Final acceptance

| Check | Expected result | Result / notes |
| --- | --- | --- |
| Full journal review | No unexplained Compact Capture or JavaScript error |  |
| Required rows | Every required row above is Pass |  |
| Reviewer | Name/date recorded before merge |  |
