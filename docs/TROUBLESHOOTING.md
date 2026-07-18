# Troubleshooting

## Confirm the supported Shell version

Run:

```sh
gnome-shell --version
```

The current extension supports GNOME Shell 50 only. Do not disable GNOME's
extension-version validation to force another major version: Compact Capture
depends on private ScreenshotUI details and intentionally fails open when the
contract does not match.

## Build and install

From the repository root:

```sh
npm test
npm run check
./build.sh
gnome-extensions install --force \
  dist/compact-capture@uripeer3.github.io.shell-extension.zip
```

On Wayland, log out and back in after the initial manual installation and after
replacing JavaScript modules during development. GNOME Shell caches loaded
extension modules; toggling the extension does not reliably reload changed
source code.

## Collect a focused journal

After reproducing a problem once, run:

```sh
journalctl --user -b -o cat |
  grep -E 'Compact Capture|JS ERROR|Gjs-Message' |
  tail -80
```

Include the GNOME Shell version, capture type, display scale, pointer setting
and exact action that triggered the problem. Avoid attaching a screenshot that
contains information you do not intend to share.

## Expected fail-open behaviour

A message beginning with
`Compact Capture disabled its ScreenshotUI adapter` means a supported private
contract member was unavailable. The annotation UI should remain absent and
GNOME's native screenshot UI should continue working. The full issue list in
that message is more useful than forcing the extension to load.

If annotation rendering fails during capture, Compact Capture logs the failure
and delegates to GNOME's unchanged capture path. The resulting screenshot may
therefore omit annotations; it must not leave the native cursor, selector or
capture controls stuck.

## Workflow checks

- Area capture begins with GNOME's shade and the translated selection hint, but
  without a completed default rectangle.
- The Compact Capture toolbar appears only after an area is selected, or in
  supported Screen mode.
- Window capture and recording are intentionally native and show no annotation
  toolbar.
- Save and `Ctrl+C` include committed annotations. If preview works but output
  does not, capture a focused journal and compare both paths before retrying.
