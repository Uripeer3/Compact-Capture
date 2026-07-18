// SPDX-License-Identifier: GPL-3.0-only

export const GestureSource = Object.freeze({
    NONE: 'none',
    POINTER: 'pointer',
    TOUCH: 'touch',
});

export class GestureSequence {
    #identity = null;
    #source = GestureSource.NONE;

    get active() {
        return this.#source !== GestureSource.NONE;
    }

    get isPointer() {
        return this.#source === GestureSource.POINTER;
    }

    beginPointer(button) {
        if (this.active)
            return false;
        if (!Number.isInteger(button) || button <= 0)
            throw new TypeError('Pointer button must be a positive integer');

        this.#source = GestureSource.POINTER;
        this.#identity = button;
        return true;
    }

    beginTouch(sequence) {
        if (this.active)
            return false;
        if (sequence === null || sequence === undefined)
            throw new TypeError('Touch sequence is required');

        this.#source = GestureSource.TOUCH;
        this.#identity = sequence;
        return true;
    }

    ownsPointer(button) {
        return this.#source === GestureSource.POINTER &&
            this.#identity === button;
    }

    ownsTouch(sequence) {
        return this.#source === GestureSource.TOUCH &&
            this.#identity === sequence;
    }

    clear() {
        const changed = this.active;
        this.#source = GestureSource.NONE;
        this.#identity = null;
        return changed;
    }
}
