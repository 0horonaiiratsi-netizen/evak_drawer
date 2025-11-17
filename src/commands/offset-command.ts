/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "../app";
import { SceneObject } from "../scene/scene-object";
import { OffsetTool } from "../tools/offset-tool";
import { Command } from "./command";
import { ToolType } from "../tools/tool";
import { Point } from "../scene/point";

class PatchedOffsetTool extends OffsetTool {
    constructor(app: App, private onFinish: () => void) {
        super(app);
    }

    async activate(): Promise<void> {
        // We override activate to prevent it from switching back to the select tool.
        // It will call onFinish() instead.
        super.activate(); // This just calls Tool.activate()
        this.reset();

        const distanceStr = await this.app.dialogController.prompt("Зміщення", "Введіть відстань зміщення:", "20");
        const distance = parseFloat(distanceStr || '');

        if (isNaN(distance) || distance === 0) {
            this.onFinish(); // Instead of switching tool, we notify the command manager
            return;
        }
        
        (this as any).offsetDistance = distance;
    }
}

// FIX: Implement the Command interface and its required properties.
export class OffsetCommand implements Command {
    app: App;
    type: ToolType = ToolType.OFFSET;
    private wrappedTool: PatchedOffsetTool;

    constructor(app: App) {
        this.app = app;
        this.wrappedTool = new PatchedOffsetTool(app, () => {
            this.app.commandManager.finishCommand();
        });
    }

    start(preSelectedObjects?: SceneObject[]): void {
        this.app.activeTool = this;
        this.wrappedTool.activate();
    }
    
    finish(): void { this.wrappedTool.deactivate(); }
    cancel(): void { this.wrappedTool.deactivate(); }

    // Delegate all Tool methods
    onMouseDown(point: Point, event: MouseEvent): void { this.wrappedTool.onMouseDown(point, event); }
    onMouseMove(point: Point, event: MouseEvent): void { this.wrappedTool.onMouseMove(point, event); }
    onMouseUp(point: Point, event: MouseEvent): void { this.wrappedTool.onMouseUp(point, event); }
    onKeyDown(event: KeyboardEvent): void { this.wrappedTool.onKeyDown(event); }
    onKeyUp(event: KeyboardEvent): void { this.wrappedTool.onKeyUp(event); }
    onContextMenu(worldPoint: Point, screenPoint: Point): void { this.wrappedTool.onContextMenu(worldPoint, screenPoint); }
    drawOverlay(ctx: CanvasRenderingContext2D, zoom: number): void { this.wrappedTool.drawOverlay(ctx, zoom); }
    getCursor(): string { return this.wrappedTool.getCursor(); }
    activate(): void { this.wrappedTool.activate(); }
    deactivate(): void { this.wrappedTool.deactivate(); }
}