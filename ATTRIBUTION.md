# Attribution and provenance

Compact Capture is an independently structured project inspired by GNOME's
built-in screenshot interface and KDE Spectacle's compact annotation workflow.

The annotation tool semantics, parts of the rendering approach in
`src/core/annotationRenderer.js`, and the interaction pattern behind
`src/ui/compactToolbar.js` were adapted from the project below. The symbolic
rectangle, arrow and highlighter assets were also adapted from its GPL source:

- **Gradia Capture**, by Alexander Vanhee and contributors
- Source: <https://github.com/AlexanderVanhee/gradia-capture>
- Reviewed source commit: `9e441493a132e9f38d3a7fdf5d7f0d55a0a36369`
- Licence: GNU General Public License version 3

The repository therefore uses the compatible GPL-3.0-only licence and retains
this attribution.

The delayed hover lifecycle and positioning approach in
`src/ui/compactTooltip.js` was adapted from:

- **GNOME Shell**, by the GNOME project contributors
- Source: <https://gitlab.gnome.org/GNOME/gnome-shell>
- Reviewed source file: `js/ui/screenshot.js`
- Reviewed source commit: `a9523055bade7e7bf551daedbf8df2701baf77ca`
- Licence: GNU General Public License version 2 or later

No code was copied from `abdallah-alkanani/no-screenshot-box`. In particular,
Gradia Capture's `selectionClearer.js` was intentionally excluded because its
upstream licensing was not established at the time this project was created.

GNOME and KDE names are used only to describe compatibility and design
inspiration; neither project endorses Compact Capture.
