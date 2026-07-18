# PR 11 manual test and performance contract

Run the Shell-independent checks first:

```sh
npm test
npm run check
npm run benchmark
./build.sh
```

## Output parity

At 100% and 200% display scale, repeat area and full-screen capture with the
native pointer switch both off and on.

1. Draw a thin freehand line, a rectangle, an arrow and a translucent
   highlighter stroke near every edge of the output.
2. Put the pointer entirely inside the selection, partly across each edge and
   entirely outside it.
3. Capture once with `Ctrl+C`, once with `Enter` and once with GNOME's capture
   button. Compare the clipboard image and saved PNG at 100% zoom.
4. Confirm annotations have identical coordinates and alpha in every output,
   the pointer appears exactly once when enabled, and edge-overlapping pointers
   are clipped without wrapping or scaling artifacts.
5. Repeat with the pointer disabled. The annotation output must remain
   unchanged and no pointer pixels may appear.

## Failure and restoration

1. Temporarily make annotation output preparation throw before delegation.
   Confirm GNOME performs one unchanged capture and the pointer actor is
   restored afterward.
2. Temporarily make the native save reject after the output is installed.
   Confirm the error is not converted into a second capture and cursor state is
   restored.
3. Close ScreenshotUI or disable Compact Capture while a capture is pending.
   Reopen it and confirm pointer visibility, position and scale remain native.
4. Check the user journal for `Compact Capture`, `JS ERROR` and `Gjs-Message`
   entries after each scenario.

## 4K/200% performance measurement

Use a 3840 x 2160 output produced from a 1920 x 1080 logical monitor at 200%.
Use the same annotation document for every run, allow one warm-up capture and
then record at least ten pointer-off and ten pointer-on captures. Do not mix
other Shell activity into a run.

Record end-to-end time from activation until the screenshot notification and
GNOME Shell resident memory immediately before and after each capture. Resident
memory can be sampled with:

```sh
shell_pid="$(pidof gnome-shell)"
ps -o rss= -p "$shell_pid"
```

Report the median latency and the largest resident-memory increase, together
with the Fedora, GNOME Shell, Mutter, GPU and driver versions. Compare the
result with the parent commit using the same session and document.

| Build | Pointer | Median capture time | Max RSS increase |
| --- | --- | ---: | ---: |
| Parent commit | Off | To measure | To measure |
| Parent commit | On | To measure | To measure |
| PR 11 | Off | To measure | To measure |
| PR 11 | On | To measure | To measure |

The source-level resource contract is already executable in unit tests. At 4K
the annotation pixel buffer is 33,177,600 bytes (31.64 MiB). Pointer-off uses
the uploaded annotation texture directly. Pointer-on adds one same-sized GPU
render target, but eliminates the former intermediate texture readback, PNG
encode, variable-sized memory stream, decoded pixbuf and second pixel upload.
Both paths therefore have zero intermediate PNG encodes and zero texture
readbacks before GNOME's one final native encode.
