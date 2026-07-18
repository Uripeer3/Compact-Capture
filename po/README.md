# Translating Compact Capture

Compact Capture uses the `compact-capture` gettext domain declared in
`src/metadata.json`. Copy `compact-capture.pot` to `<locale>.po`, translate the
`msgstr` entries and keep the source encoding as UTF-8.

`build.sh` validates and compiles every `po/*.po` file with `msgfmt`, then
packages the resulting catalog under the extension's `locale/` directory. A
build without translation files does not require gettext development tools.

When UI strings change, update the template and `POTFILES.in` in the same pull
request. `tests/translationContract.test.js` prevents a current user-facing
message from being omitted accidentally.
