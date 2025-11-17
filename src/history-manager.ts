/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export class HistoryManager {
    private serialize: () => string;
    private load: (state: string) => void;
    private undoStack: string[] = [];
    private redoStack: string[] = [];
    private maxHistorySize = 50;

    constructor(serialize: () => string, load: (state: string) => void) {
        this.serialize = serialize;
        this.load = load;
    }

    addState(action?: string): void {
        const state = this.serialize();
        if (this.undoStack.length > 0 && this.undoStack[this.undoStack.length - 1] === state) {
            return;
        }

        this.undoStack.push(state);
        this.redoStack = [];

        if (this.undoStack.length > this.maxHistorySize) {
            this.undoStack.shift();
        }

        if (action) {
            console.log(`History: ${action}`);
        }
    }

    undo(): void {
        if (!this.canUndo()) return;

        const currentState = this.undoStack.pop()!;
        this.redoStack.push(currentState);
        
        const stateToRestore = this.undoStack[this.undoStack.length - 1];
        if (stateToRestore) {
            this.load(stateToRestore);
        }
        
        console.log("History: Undo");
    }

    redo(): void {
        if (!this.canRedo()) return;

        const stateToRestore = this.redoStack.pop()!;
        this.undoStack.push(stateToRestore);
        this.load(stateToRestore);

        console.log("History: Redo");
    }

    canUndo(): boolean {
        return this.undoStack.length > 1;
    }

    canRedo(): boolean {
        return this.redoStack.length > 0;
    }

    clear(): void {
        this.undoStack = [];
        this.redoStack = [];
    }
}
