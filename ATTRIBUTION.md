# Attribution and provenance

Compact Capture is an independently structured project inspired by GNOME's
built-in screenshot interface and KDE Spectacle's compact annotation workflow.

The annotation tool semantics, parts of the rendering approach in
`src/annotationRenderer.js`, and the interaction pattern behind
`src/compactToolbar.js` were adapted from:

- **Gradia Capture**, by Alexander Vanhee and contributors
- Source: <https://github.com/AlexanderVanhee/gradia-capture>
- Reviewed source commit: `9e441493a132e9f38d3a7fdf5d7f0d55a0a36369`
- Licence: GNU General Public License version 3

The repository therefore uses the compatible GPL-3.0-only licence and retains
this attribution.

No code was copied from `abdallah-alkanani/no-screenshot-box`. In particular,
Gradia Capture's `selectionClearer.js` was intentionally excluded because its
upstream licensing was not established at the time this project was created.

GNOME and KDE names are used only to describe compatibility and design
inspiration; neither project endorses Compact Capture.
