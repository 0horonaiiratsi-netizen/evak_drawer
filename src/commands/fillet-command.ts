/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "../app";
import { SceneObject } from "../scene/scene-object";
import { FilletTool } from "../tools/fillet-tool";
import { Command } from "./command";
import { ToolType } from "../tools/tool";
import { Point } from "../scene/point";

class PatchedFilletTool extends FilletTool {
    constructor(app: App, private onFinish: () => void) {
        super(app);
    }

    protected resetAndSwitchToSelect(): void {
        this.reset();
        this.onFinish();
    }
}

export class FilletCommand implements Command {
    app: App;
    type: ToolType = ToolType.FILLET;
    private wrappedTool: PatchedFilletTool;

    constructor(app: App) {
        this.app = app;
        this.wrappedTool = new PatchedFilletTool(app, () => {
            this.app.commandManager.finishCommand();
        });
    }

    start(preSelectedObjects?: SceneObject[]): void {
        if (preSelectedObjects && preSelectedObjects.length > 0) {
            this.app.selectionService.set(preSelectedObjects.map(o => o.id));
        }
        this.app.activeTool = this;
        this.wrappedTool.activate();
    }
    
    finish(): void { this.wrappedTool.deactivate(); }
    cancel(): void { this.wrappedTool.deactivate(); }

    // Delegate all Tool methods
    onMouseDown(point: Point, event: MouseEvent): void { this.wrappedTool.onMouseDown(point, event); }
    onMouseMove(point: Point, event: MouseEvent): void { (this.wrappedTool as any).onMouseMove(point, event); }
    onMouseUp(point: Point, event: MouseEvent): void { (this.wrappedTool as any).onMouseUp(point, event); }
    onKeyDown(event: KeyboardEvent): void { (this.wrappedTool as any).onKeyDown(event); }
    onKeyUp(event: KeyboardEvent): void { (this.wrappedTool as any).onKeyUp(event); }
    onContextMenu(worldPoint: Point, screenPoint: Point): void { (this.wrappedTool as any).onContextMenu(worldPoint, screenPoint); }
    drawOverlay(ctx: CanvasRenderingContext2D, zoom: number): void { (this.wrappedTool as any).drawOverlay(ctx, zoom); }
    getCursor(): string { return this.wrappedTool.getCursor(); }
    activate(): void { this.wrappedTool.activate(); }
    deactivate(): void { this.wrappedTool.deactivate(); }
}