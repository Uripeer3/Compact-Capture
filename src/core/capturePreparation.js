// SPDX-License-Identifier: GPL-3.0-only

function requireCallback(callback, name) {
    if (typeof callback !== 'function')
        throw new TypeError(`${name} must be a function`);
}

export class CapturePreparation {
    #activeRelease = null;

    get active() {
        return this.#activeRelease !== null;
    }

    begin({finishDraft, snapshot, setInputEnabled}) {
        requireCallback(finishDraft, 'Draft finalizer');
        requireCallback(snapshot, 'Snapshot provider');
        requireCallback(setInputEnabled, 'Input-state callback');

        if (this.#activeRelease)
            return null;

        let inputLocked = false;
        let released = false;
        const release = () => {
            if (released)
                return false;

            released = true;
            if (this.#activeRelease === release)
                this.#activeRelease = null;
            if (inputLocked)
                setInputEnabled(true);
            return true;
        };
        this.#activeRelease = release;

        try {
            finishDraft();
            inputLocked = true;
            setInputEnabled(false);
            const annotations = snapshot();
            if (!Array.isArray(annotations))
                throw new TypeError('Annotation snapshot must be an array');

            return Object.freeze({annotations, release});
        } catch (error) {
            release();
            throw error;
        }
    }

    cancel() {
        return this.#activeRelease?.() ?? false;
    }
}
