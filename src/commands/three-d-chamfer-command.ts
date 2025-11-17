/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { App } from "../app";
import { ThreeDChamferTool } from "../tools/three-d-chamfer-tool";
import { Command } from "./command";

export class ThreeDChamferCommand implements Command {
    app: App;
    type: any;
    private tool: ThreeDChamferTool;

    constructor(app: App) {
        this.app = app;
        this.tool = new ThreeDChamferTool(app);
    }

    async start(preSelectedObjects: any[] = []): Promise<void> {
        this.app.setActiveTool(this.tool.type);
        await this.tool.activate();
    }

    cancel(): void {
        this.tool.deactivate();
        this.app.setActiveTool(null);
    }

    finish(): void {
        this.tool.deactivate();
        this.app.setActiveTool(null);
    }

    activate(): void {}
    deactivate(): void {}
    onMouseDown(point: any, event: any): void {}
    onMouseMove(point: any, event: any): void {}
    onMouseUp(point: any, event: any): void {}
    onKeyDown(event: any): void {}
    onKeyUp(event: any): void {}
    onContextMenu(worldPoint: any, screenPoint: any): void {}
    drawOverlay(ctx: any, zoom: any): void {}
    getCursor(): string { return 'default'; }
}
