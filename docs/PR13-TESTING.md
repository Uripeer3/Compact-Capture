# PR 13 manual test checklist

PR 13 is accepted only after the applicable rows below pass on a real GNOME 50
session. Record results in the PR 13 section of
[CUMULATIVE-TEST-CHECKLIST.md](CUMULATIVE-TEST-CHECKLIST.md); automated fixtures
do not replace the RTL, accessibility or fail-open session checks.

## Automated and package checks

| Test | Required result | Result / evidence |
| --- | --- | --- |
| Node suite | `npm test` passes translation, package, version and existing regression tests |  |
| Syntax | `npm run check` passes |  |
| Performance | `npm run benchmark` remains within the documented bounded-work contract |  |
| GJS pixels | `npm run test:gjs` passes at 1x and 2x |  |
| Package | `./build.sh` succeeds and the archive contains source, licence, attribution and every compiled `locale/` catalog |  |

## Localization and RTL

| Test | Required result | Result / evidence |
| --- | --- | --- |
| Catalog fallback | With no translation for the active locale, every label and hint remains readable in English |  |
| Translated catalog | Install one reviewer-supplied test catalog; toolbar accessible names, hover hints, colours, actions and selection hint use it |  |
| RTL layout | In an RTL session, toolbar grouping and focus traversal remain coherent; icons, colour swatches, separators and slider stay aligned |  |
| RTL placement | At left/right selection and monitor edges, the toolbar remains inside its monitor and avoids native resize handles |  |
| Narrow/200% | Long translated strings affect only tooltip/hint size; compact icon hit targets and toolbar width remain stable |  |
| Accessibility | Screen reader names match visible translated hints and insensitive actions are not focusable |  |

## Compatibility and fail-open behavior

| Test | Required result | Result / evidence |
| --- | --- | --- |
| GNOME 50 | Adapter enables with no compatibility warning on the supported public release |  |
| Metadata parity | Installed metadata advertises exactly the runtime-gated major versions |  |
| Unsupported fixture | Automated previous/future/malformed version fixtures reject the adapter |  |
| Missing private seam | Contract fixtures report all unavailable members and make no method or actor mutation |  |
| Enable failure | A simulated injection/connection failure rolls back completed work and leaves native screenshot capture usable |  |
| Disable | Five enable/disable cycles leave no toolbar, hint, overlay, signal, hidden handle or inactive native capture button |  |

## Privacy, documentation and regressions

| Test | Required result | Result / evidence |
| --- | --- | --- |
| Data boundary | README, architecture and privacy documents agree that GNOME owns capture, clipboard, storage and notifications |  |
| Limitations | Area/Screen support, native Window/recording behavior and GNOME 50 gating are stated consistently |  |
| Obscure deferral | No v0.1 document promises Pixelate/Blur; the v0.2 roadmap contains its design, performance, parity and privacy gates |  |
| Native fallback | Empty document, Window and recording output match GNOME without Compact Capture |  |
| Annotated output | Four v0.1 tools retain preview, clipboard and PNG parity with pointer off/on |  |
| Journal | No unexplained Compact Capture, JavaScript or gettext error remains after the full run |  |
