// SPDX-License-Identifier: GPL-3.0-only

export class AsyncTaskGate {
    #activePromise = null;

    get active() {
        return this.#activePromise !== null;
    }

    run(task) {
        if (typeof task !== 'function')
            throw new TypeError('Async task must be a function');
        if (this.#activePromise)
            return this.#activePromise;

        const promise = Promise.resolve().then(task);
        const activePromise = promise.finally(() => {
            if (this.#activePromise === activePromise)
                this.#activePromise = null;
        });
        this.#activePromise = activePromise;
        return activePromise;
    }
}
