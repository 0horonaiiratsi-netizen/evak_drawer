/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "../app";
import { SceneObject } from "../scene/scene-object";
import { ScaleTool } from "../tools/scale-tool";
import { Command } from "./command";
import { ToolType } from "../tools/tool";
import { Point } from "../scene/point";

class PatchedScaleTool extends ScaleTool {
    constructor(app: App, private onFinish: () => void) {
        super(app);
    }

    protected resetAndSwitchToSelect(): void {
        this.reset();
        this.onFinish();
    }
}

export class ScaleCommand implements Command {
    app: App;
    type: ToolType = ToolType.SCALE_BY_REFERENCE;
    private wrappedTool: PatchedScaleTool;

    constructor(app: App) {
        this.app = app;
        this.wrappedTool = new PatchedScaleTool(app, () => {
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
    onMouseDown(point: Point, event: MouseEvent): void { (this.wrappedTool as any).onMouseDown(point, event); }
    onMouseMove(point: Point, event: MouseEvent): void { this.wrappedTool.onMouseMove(point, event); }
    onMouseUp(point: Point, event: MouseEvent): void { (this.wrappedTool as any).onMouseUp(point, event); }
    onKeyDown(event: KeyboardEvent): void { this.wrappedTool.onKeyDown(event); }
    onKeyUp(event: KeyboardEvent): void { this.wrappedTool.onKeyUp(event); }
    onContextMenu(worldPoint: Point, screenPoint: Point): void { this.wrappedTool.onContextMenu(worldPoint, screenPoint); }
    drawOverlay(ctx: CanvasRenderingContext2D, zoom: number): void { this.wrappedTool.drawOverlay(ctx, zoom); }
    getCursor(): string { return this.wrappedTool.getCursor(); }
    activate(): void { this.wrappedTool.activate(); }
    deactivate(): void { this.wrappedTool.deactivate(); }
}
