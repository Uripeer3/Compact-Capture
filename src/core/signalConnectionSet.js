// SPDX-License-Identifier: GPL-3.0-only

export class SignalConnectionSet {
    #connections = [];
    #onDisconnectError;

    constructor({onDisconnectError = null} = {}) {
        this.#onDisconnectError = onDisconnectError;
    }

    get size() {
        return this.#connections.length;
    }

    replace(targets, signal, callback) {
        if (!Array.isArray(targets))
            throw new TypeError('Signal targets must be an array');
        if (typeof signal !== 'string' || signal.length === 0)
            throw new TypeError('Signal name must be a non-empty string');
        if (typeof callback !== 'function')
            throw new TypeError('Signal callback must be a function');

        this.clear();
        const connections = [];
        try {
            for (const target of targets) {
                if (typeof target?.connect !== 'function' ||
                    typeof target?.disconnect !== 'function') {
                    throw new TypeError(
                        'Signal target must support connect and disconnect'
                    );
                }
                const id = target.connect(
                    signal,
                    (...args) => callback(target, ...args)
                );
                connections.push([target, id]);
            }
        } catch (error) {
            this.#disconnect(connections);
            throw error;
        }

        this.#connections = connections;
    }

    clear() {
        const connections = this.#connections;
        this.#connections = [];
        this.#disconnect(connections);
    }

    #disconnect(connections) {
        for (const [target, id] of [...connections].reverse()) {
            try {
                target.disconnect(id);
            } catch (error) {
                if (typeof this.#onDisconnectError === 'function')
                    this.#onDisconnectError(error);
            }
        }
    }
}
