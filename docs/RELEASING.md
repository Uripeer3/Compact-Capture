# Release process

A release is made from a clean commit only after automated checks and the
applicable real-session checklist pass. A passing build does not replace manual
GNOME Shell testing.

## Automated gate

Run:

```sh
npm test
npm run check
npm run benchmark
npm run test:gjs
./build.sh
bash tools/verify-package.sh
```

CI runs the same build and package verification. The verifier permits only the
runtime JavaScript, metadata, stylesheet, symbolic icons, compiled translation
catalogs, licence and attribution. Tests, source catalogs, documentation and
build tooling must not enter the submitted ZIP.

## Manual gate

Complete [PR 14 testing](testing/PR14-TESTING.md) and record the results in the
[cumulative checklist](testing/CUMULATIVE-TEST-CHECKLIST.md). Required rows must
pass on the exact release commit; results from an older commit remain historical
evidence.

## Publish

After acceptance:

1. Build once more from the accepted clean commit.
2. Verify the ZIP and record its SHA-256 digest.
3. Tag that commit `v0.1.0`.
4. Attach the verified ZIP and release notes to the GitHub release.
5. Submit that same ZIP to extensions.gnome.org only after a final review
   against the current GNOME extension guidelines.

Do not add a `version` key to `metadata.json`; extensions.gnome.org owns that
deprecated internal field.
