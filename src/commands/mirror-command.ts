/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "../app";
import { Point } from "../scene/point";
import { SceneObject } from "../scene/scene-object";
import { Command } from "./command";
import { MirrorTool } from "../tools/mirror-tool";
import { ToolType } from "../tools/tool";


class PatchedMirrorTool extends MirrorTool {
    constructor(app: App, private onFinish: () => void) {
        super(app);
    }

    protected resetAndSwitchToSelect(): void {
        this.reset();
        this.onFinish();
    }
}

export class MirrorCommand implements Command {
    app: App;
    type: ToolType = ToolType.MIRROR;
    private wrappedTool: PatchedMirrorTool;

    constructor(app: App) {
        this.app = app;
        this.wrappedTool = new PatchedMirrorTool(app, () => {
            // When the tool finishes, it tells the command manager to finish as well.
            this.app.commandManager.finishCommand();
        });
    }

    start(preSelectedObjects?: SceneObject[]): void {
        if (preSelectedObjects && preSelectedObjects.length > 0) {
            this.app.selectionService.set(preSelectedObjects.map(o => o.id));
        }
        // The command itself becomes the active "tool" for the input handler
        this.app.activeTool = this;
        this.wrappedTool.activate();
    }
    
    finish(): void {
        this.wrappedTool.deactivate();
    }

    cancel(): void {
        this.wrappedTool.deactivate();
    }

    // Delegate all Tool methods to the wrapped tool instance
    onMouseDown(point: Point, event: MouseEvent): void { this.wrappedTool.onMouseDown(point, event); }
    onMouseMove(point: Point, event: MouseEvent): void { this.wrappedTool.onMouseMove(point, event); }
    onMouseUp(point: Point, event: MouseEvent): void { (this.wrappedTool as any).onMouseUp(point, event); }
    onKeyDown(event: KeyboardEvent): void { this.wrappedTool.onKeyDown(event); }
    onKeyUp(event: KeyboardEvent): void { this.wrappedTool.onKeyUp(event); }
    onContextMenu(worldPoint: Point, screenPoint: Point): void { this.wrappedTool.onContextMenu(worldPoint, screenPoint); }
    drawOverlay(ctx: CanvasRenderingContext2D, zoom: number): void { this.wrappedTool.drawOverlay(ctx, zoom); }
    getCursor(): string { return this.wrappedTool.getCursor(); }
    
    // Satisfy the Tool abstract methods, even though they just delegate
    activate(): void { this.wrappedTool.activate(); }
    deactivate(): void { this.wrappedTool.deactivate(); }
}