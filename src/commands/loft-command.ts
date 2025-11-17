/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "../app";
import { Command } from "./command";
import { Point } from "../scene/point";
import { SceneObject } from "../scene/scene-object";
import { ToolType } from "../tools/tool";
import { I18nService } from "../i18n";
import { PolylineObject } from "../scene/polyline-object";
import { SketchObject } from "../scene/sketch-object";
import { LoftObject } from "../scene/loft-object";
import { LogService } from "../services/logger";

export class LoftCommand implements Command {
    app: App;
    i18n: I18nService;
    type: ToolType = ToolType.LOFT;
    
    private profiles: (PolylineObject | SketchObject)[] = [];

    constructor(app: App) {
        this.app = app;
        this.i18n = app.i18n;
    }

    start(preSelectedObjects: SceneObject[] = []): void {
        this.reset();
        this.app.setSelectedObjectIds([]);
        this.app.commandLineController.setPrompt(this.i18n.t('command.loft.selectProfiles'));
    }
    
    finish(): void {
        this.cleanup();
        this.app.commandFinished();
    }

    cancel(): void {
        this.cleanup();
        this.app.commandFinished();
    }
    
    private cleanup(): void {
        this.reset();
        this.app.draw();
    }
    
    private reset(): void {
        this.profiles = [];
    }

    onMouseDown(point: Point, event: MouseEvent): void {}
    onMouseMove(point: Point, event: MouseEvent): void {}
    onMouseUp(point: Point, event: MouseEvent): void {}
    onKeyDown(event: KeyboardEvent): void {}
    onKeyUp(event: KeyboardEvent): void {}
    onContextMenu(worldPoint: Point, screenPoint: Point): void {}
    drawOverlay(ctx: CanvasRenderingContext2D, zoom: number): void {}
    activate(): void {}
    deactivate(): void {}
    getCursor(): string { return 'crosshair'; }
}
