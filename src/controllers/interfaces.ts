/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { SceneObject } from "../scene/scene-object";

/**
 * An interface for objects that need to be notified when the selection changes.
 * This is part of an observer pattern to decouple the SelectionService from UI controllers.
 */
export interface SelectionObserver {
    onSelectionChanged(selectedObjects: SceneObject[]): void;
}

/**
 * An interface for objects that need to be notified when the project history changes (undo/redo).
 */
export interface HistoryObserver {
    onHistoryChanged(): void;
}