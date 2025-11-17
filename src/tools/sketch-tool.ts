/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "../app";
import { Tool, ToolType } from "./tool";
import { Point } from "../scene/point";

export class SketchTool extends Tool {
    constructor(app: App) {
        super(app, ToolType.SKETCH);
    }

    activate(): void {
        super.activate();
        this.app.enterSketchMode();
    }
    
    deactivate(): void {
        // This is called if another tool is selected. We should exit sketch mode.
        if (this.app.isSketchMode) {
            this.app.exitSketchMode(false); // Discard changes
        }
        super.deactivate();
    }
    
    getCursor(): string {
        return 'crosshair';
    }
}
