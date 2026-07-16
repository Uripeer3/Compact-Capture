# Contributing

Keep changes narrow and independently reviewable. Features that replace
GNOME's native capture, storage, clipboard, notification or screencast paths
are out of scope unless the architecture document is amended first.

Before submitting a change:

1. Run `npm test`.
2. Run `npm run check`.
3. Add tests for pure model behaviour.
4. Document any new access to private GNOME Shell fields in the Shell adapter.
5. Record the origin and licence of imported code or artwork.

Commits intended for the original Gradia Capture project should avoid unrelated
Compact Capture restructuring so they can be proposed upstream separately.

