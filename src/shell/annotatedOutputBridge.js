// SPDX-License-Identifier: GPL-3.0-only

function snapshotCursor(screenshotUi) {
    const actor = screenshotUi._cursor;
    const state = Object.freeze({
        content: actor.content,
        visible: actor.visible,
        opacity: actor.opacity,
        x: actor.x,
        y: actor.y,
        scale: Number.isFinite(screenshotUi._cursorScale)
            ? screenshotUi._cursorScale
            : 1,
    });
    const texture = state.visible
        ? state.content?.get_texture?.() ?? null
        : null;

    return Object.freeze({
        actor,
        state,
        cursor: texture
            ? Object.freeze({
                texture,
                x: state.x,
                y: state.y,
                width: texture.get_width(),
                height: texture.get_height(),
                scale: state.scale,
            })
            : null,
    });
}

export class AnnotatedOutputBridge {
    #activeRestore = null;
    #createOutput;
    #generation = 0;
    #onError;
    #screenshotUi;

    constructor({screenshotUi, createOutput, onError = console.error}) {
        this.#screenshotUi = screenshotUi;
        this.#createOutput = createOutput;
        this.#onError = onError;
    }

    invalidate() {
        this.#generation++;
        const active = this.#activeRestore;
        this.#activeRestore = null;
        if (active && this.#screenshotUi?._cursor === active.snapshot.actor)
            this.#restoreState(active.snapshot);
    }

    async save({
        screenshotUi,
        originalMethod,
        args,
        strokes,
        selection,
        outputScale,
    }) {
        if (screenshotUi !== this.#screenshotUi)
            return originalMethod.apply(screenshotUi, args);

        let cursorSnapshot;
        const ownership = Object.freeze({
            generation: this.#generation,
            actor: this.#screenshotUi._cursor,
        });
        try {
            cursorSnapshot = snapshotCursor(this.#screenshotUi);
            const output = await this.#createOutput({
                strokes,
                selection,
                outputScale,
                cursor: cursorSnapshot.cursor,
            });
            if (!this.#owns(ownership))
                return originalMethod.apply(screenshotUi, args);

            const active = Object.freeze({
                ownership,
                snapshot: cursorSnapshot,
            });
            this.#activeRestore = active;
            try {
                this.#install(output, ownership);
            } catch (error) {
                this.#restoreOwned(active);
                throw error;
            }
        } catch (error) {
            this.#onError(
                'Compact Capture could not prepare annotated output; ' +
                'using GNOME capture unchanged',
                error
            );
            return originalMethod.apply(screenshotUi, args);
        }

        const active = this.#activeRestore;
        try {
            return await originalMethod.apply(screenshotUi, args);
        } finally {
            this.#restoreOwned(active);
        }
    }

    #install(output, ownership) {
        this.#requireOwnership(ownership);
        ownership.actor.set_content(output.content);
        this.#requireOwnership(ownership);
        ownership.actor.set_position(output.x, output.y);
        this.#requireOwnership(ownership);
        ownership.actor.visible = true;
        // The texture is an output-only bridge; do not flash it inside the
        // still-open screenshot UI while GNOME encodes the image.
        this.#requireOwnership(ownership);
        ownership.actor.opacity = 0;
        this.#requireOwnership(ownership);
        this.#screenshotUi._cursorScale = output.scale;
    }

    #owns(ownership) {
        return ownership.generation === this.#generation &&
            this.#screenshotUi?._cursor === ownership.actor;
    }

    #requireOwnership(ownership) {
        if (!this.#owns(ownership))
            throw new Error('Annotation output session was invalidated');
    }

    #restoreOwned(active) {
        if (!active || this.#activeRestore !== active)
            return false;

        this.#activeRestore = null;
        if (!this.#owns(active.ownership))
            return false;

        this.#restoreState(active.snapshot);
        return true;
    }

    #restoreState(snapshot) {
        const {actor, state} = snapshot;
        this.#tryRestore(
            actor,
            'content',
            () => actor.set_content(state.content)
        );
        this.#tryRestore(actor, 'position', () => {
            actor.set_position(state.x, state.y);
        });
        this.#tryRestore(actor, 'visibility', () => {
            actor.visible = state.visible;
        });
        this.#tryRestore(actor, 'opacity', () => {
            actor.opacity = state.opacity;
        });
        this.#tryRestore(actor, 'scale', () => {
            this.#screenshotUi._cursorScale = state.scale;
        });
    }

    #tryRestore(actor, property, callback) {
        if (this.#screenshotUi?._cursor !== actor)
            return;
        try {
            callback();
        } catch (error) {
            this.#onError(
                `Compact Capture could not restore GNOME cursor ${property}`,
                error
            );
        }
    }
}
