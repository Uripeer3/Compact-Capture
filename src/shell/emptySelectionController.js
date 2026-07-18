// SPDX-License-Identifier: GPL-3.0-only

export class EmptySelectionController {
    #active = false;
    #onError;
    #snapshot = null;

    constructor({onError = null} = {}) {
        this.#onError = onError;
    }

    get active() {
        return this.#active;
    }

    enter({
        selector,
        visualActors,
        captureButton,
        cursorType,
        emptyCoordinate,
    }) {
        if (this.#active)
            return true;

        let snapshot;
        try {
            snapshot = {
                selector,
                areaIndicator: selector._areaIndicator,
                captureButton,
                coordinates: {
                    startX: selector._startX,
                    startY: selector._startY,
                    lastX: selector._lastX,
                    lastY: selector._lastY,
                },
                geometry: [...selector.getGeometry()],
                actorOpacities: visualActors.map(actor => [
                    actor,
                    actor.opacity,
                ]),
                captureButtonReactive: captureButton.reactive,
            };

            selector._startX = emptyCoordinate;
            selector._startY = emptyCoordinate;
            selector._lastX = emptyCoordinate;
            selector._lastY = emptyCoordinate;
            selector._updateSelectionRect();
            selector._areaIndicator.setSelectionRect(0, 0, 1, 1);
            selector.set_cursor_type(cursorType);
            for (const [actor] of snapshot.actorOpacities)
                actor.opacity = 0;
            captureButton.reactive = false;
        } catch (error) {
            if (snapshot)
                this.#restoreSnapshot(snapshot, {restoreGeometry: true});
            this.#report('could not enter the empty area state', error);
            return false;
        }

        this.#snapshot = snapshot;
        this.#active = true;
        return true;
    }

    leave({resetGeometry}) {
        if (!this.#active)
            return true;

        const snapshot = this.#snapshot;
        // Clear ownership first so cleanup remains idempotent even if a
        // private GNOME actor operation fails.
        this.#snapshot = null;
        this.#active = false;

        let geometryRestored = true;
        if (resetGeometry) {
            try {
                snapshot.selector.reset();
            } catch (error) {
                geometryRestored = false;
                this.#report('could not reset native area geometry', error);
                this.#restoreGeometry(snapshot);
            }
        }

        const actorsRestored = this.#restoreActors(snapshot);
        const buttonRestored = this.#restoreCaptureButton(snapshot);
        return geometryRestored && actorsRestored && buttonRestored;
    }

    #restoreSnapshot(snapshot, {restoreGeometry}) {
        if (restoreGeometry)
            this.#restoreGeometry(snapshot);
        this.#restoreActors(snapshot);
        this.#restoreCaptureButton(snapshot);
    }

    #restoreGeometry(snapshot) {
        let restored = true;
        const {selector, areaIndicator, coordinates, geometry} = snapshot;
        try {
            selector._startX = coordinates.startX;
            selector._startY = coordinates.startY;
            selector._lastX = coordinates.lastX;
            selector._lastY = coordinates.lastY;
            selector._updateSelectionRect();
        } catch (error) {
            restored = false;
            this.#report('could not restore native selector coordinates', error);
        }

        try {
            areaIndicator.setSelectionRect(...geometry);
        } catch (error) {
            restored = false;
            this.#report('could not restore the native area indicator', error);
        }
        return restored;
    }

    #restoreActors(snapshot) {
        let restored = true;
        for (const [actor, opacity] of snapshot.actorOpacities) {
            try {
                actor.opacity = opacity;
            } catch (error) {
                restored = false;
                this.#report('could not restore a native selection actor', error);
            }
        }
        return restored;
    }

    #restoreCaptureButton(snapshot) {
        try {
            snapshot.captureButton.reactive = snapshot.captureButtonReactive;
            return true;
        } catch (error) {
            this.#report('could not restore the native capture button', error);
            return false;
        }
    }

    #report(message, error) {
        try {
            this.#onError?.(message, error);
        } catch {
            // Error reporting must never interrupt restoration.
        }
    }
}
