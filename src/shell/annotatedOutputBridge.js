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

function snapshotSourceTexture(screenshotUi) {
    return screenshotUi._stageScreenshot
        ?.get_content?.()
        ?.get_texture?.() ?? null;
}

export class AnnotatedOutputBridge {
    #createOutput;
    #onError;
    #screenshotUi;

    constructor({screenshotUi, createOutput, onError = console.error}) {
        this.#screenshotUi = screenshotUi;
        this.#createOutput = createOutput;
        this.#onError = onError;
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

        let cursorSnapshot = null;
        try {
            cursorSnapshot = snapshotCursor(this.#screenshotUi);
            const output = await this.#createOutput({
                strokes,
                selection,
                outputScale,
                cursor: cursorSnapshot.cursor,
                sourceTexture: snapshotSourceTexture(this.#screenshotUi),
            });
            this.#install(output, cursorSnapshot.actor);
        } catch (error) {
            this.#onError(
                'Compact Capture could not prepare annotated output; ' +
                'using GNOME capture unchanged',
                error
            );
            this.#restore(cursorSnapshot);
            return originalMethod.apply(screenshotUi, args);
        }

        try {
            return await originalMethod.apply(screenshotUi, args);
        } finally {
            this.#restore(cursorSnapshot);
        }
    }

    #install(output, cursor) {
        cursor.set_content(output.content);
        cursor.set_position(output.x, output.y);
        cursor.visible = true;
        // The texture is an output-only bridge; do not flash it inside the
        // still-open screenshot UI while GNOME encodes the image.
        cursor.opacity = 0;
        this.#screenshotUi._cursorScale = output.scale;
    }

    #restore(snapshot) {
        if (!snapshot)
            return;

        const {actor, state} = snapshot;
        try {
            actor.set_content(state.content);
            actor.set_position(state.x, state.y);
            actor.visible = state.visible;
            actor.opacity = state.opacity;
            this.#screenshotUi._cursorScale = state.scale;
        } catch (error) {
            this.#onError(
                'Compact Capture could not restore GNOME cursor state',
                error
            );
        }
    }
}
