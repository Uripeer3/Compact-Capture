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
6. Add or update a focused manual test document for Shell-visible behaviour.
7. Update `README.md`, `ROADMAP.md`, `docs/ARCHITECTURE.md` and
   `docs/DESIGN.md` when their claims or contracts change.

## Pull request contract

- Start from the current default branch and keep one user-visible concern per
  pull request.
- Describe the behaviour before and after the change, including fail-open
  behaviour when a private GNOME contract is unavailable.
- Keep GNOME responsible for capture, storage, clipboard, lockdown, sound,
  notifications and recording.
- Prefer pure modules for geometry, document state and shortcut decisions so
  Node tests can cover them without a running Shell.
- Do not expand the v0.1 feature set without first updating the roadmap and
  design specification.
- Include the commands and GNOME session checks used to validate the change.

## Documentation style

Use concise, testable statements. Distinguish current behaviour from planned
behaviour, link to the canonical document instead of duplicating long rules,
and call out private API assumptions explicitly. Screenshots and mockups explain
appearance; Markdown remains the source of truth for scope and architecture.

Commits intended for the original Gradia Capture project should avoid unrelated
Compact Capture restructuring so they can be proposed upstream separately.
