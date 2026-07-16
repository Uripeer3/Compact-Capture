# Compact Capture

Compact Capture is an experimental GNOME Shell extension exploring a compact,
accessible annotation step inside GNOME's built-in screenshot interface.

The project deliberately does **not** replace GNOME's screenshot system. GNOME
remains responsible for selection, screen and window capture, cursor handling,
clipboard output, file storage, lockdown policy, notifications and screencasts.
Compact Capture will own only annotation state, rendering and its compact UI.

## Current status

The project now includes a narrow GNOME 50 adapter and a visible compact
annotation toolbar. Tool, colour and width selection work and remain stable
while the extension is enabled. Drawing starts in PR 4, so the toolbar does not
yet alter capture output and the project is not ready for end-user installation.

If the expected GNOME interface is unavailable, the adapter stays disabled and
GNOME's original screenshot behaviour continues unchanged.

The toolbar appears only in screenshot mode. GNOME's native area/screen/window,
pointer, capture and screen-recording controls remain available and unchanged.

See [ROADMAP.md](ROADMAP.md) for the sequence to a usable 0.1 release and
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the ownership boundary.

## Development checks

The initial checks require only Node.js and have no third-party dependencies:

```sh
npm test
npm run check
```

Once the GNOME adapter lands, building the extension will additionally require
`gnome-extensions`:

```sh
./build.sh
```

## Licence and provenance

Compact Capture is distributed under GPL-3.0-only. The initial annotation-tool
behaviour is adapted from the GPL-3.0 Gradia Capture project. See
[ATTRIBUTION.md](ATTRIBUTION.md) for detailed provenance.
