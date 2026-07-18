# Compact Capture

Compact Capture is an experimental GNOME Shell extension exploring a compact,
accessible annotation step inside GNOME's built-in screenshot interface.

The project deliberately does **not** replace GNOME's screenshot system. GNOME
remains responsible for selection, screen and window capture, cursor handling,
clipboard output, file storage, lockdown policy, notifications and screencasts.
Compact Capture will own only annotation state, rendering and its compact UI.

## Current status

The project now includes a narrow GNOME 50 adapter, a compact annotation
toolbar and a monitor-aware live drawing overlay. In area mode, annotation
starts empty with a short keyboard hint; annotation controls stay hidden until
the native selection drag finishes. Freehand, rectangle, arrow and highlighter
previews, undo and clear now work.

Area and screen annotations are now composited into copied and saved
screenshots through GNOME's native output path. Captures without annotations,
window captures and screen recordings continue through GNOME unchanged. The
project remains pre-release while editing completeness and compatibility work
continue.

If the expected GNOME interface is unavailable, the adapter stays disabled and
GNOME's original screenshot behaviour continues unchanged.

The toolbar appears only in supported screenshot modes. Area and screen capture
have a drawing overlay; window capture stays entirely native for now. GNOME's
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
gnome-extensions install --force dist/compact-capture@uripeer3.github.io.shell-extension.zip 
```

After installation make sure to Log-Off and back on befor enabling the Extention.

## Licence and provenance

Compact Capture is distributed under GPL-3.0-only. The initial annotation-tool
behaviour is adapted from the GPL-3.0 Gradia Capture project. See
[ATTRIBUTION.md](ATTRIBUTION.md) for detailed provenance.
