/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "../app";
import { SceneObject } from "../scene/scene-object";
import { Tool } from "../tools/tool";

// FIX: Export CommandConstructor type.
export type CommandConstructor = (app: App) => Command;

/**
 * Interface for all commands in the application.
 * It extends the basic Tool interface to handle a lifecycle (start, finish, cancel).
 */
export interface Command extends Tool {
    /**
     * Called when the command is initiated.
     * @param preSelectedObjects Optional array of objects that were selected before the command started.
     */
    // FIX: Add optional preSelectedObjects parameter to start method.
    start(preSelectedObjects?: SceneObject[]): void;

    /**
     * Called to finalize the command's operation.
     */
    finish(): void;

    /**
     * Called when the command is cancelled (e.g., by pressing Escape).
     */
    cancel(): void;

    /**
     * Handles text input from the command line while the command is active.
     */
    // FIX: Add optional handleTextInput property.
    handleTextInput?: (input: string) => void;
}
