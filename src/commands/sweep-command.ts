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
import { SweepObject } from "../scene/sweep-object";
import { LogService } from "../services/logger";

export class SweepCommand implements Command {
    app: App;
    i18n: I18nService;
    type: ToolType = ToolType.SWEEP;
    
    private step: 'selectProfile' | 'selectPath' = 'selectProfile';
    private profileObject: PolylineObject | SketchObject | null = null;

    constructor(app: App) {
        this.app = app;
        this.i18n = app.i18n;
    }

    start(preSelectedObjects: SceneObject[] = []): void {
        this.reset();
        
        if (preSelectedObjects.length === 1 && this.isValidProfile(preSelectedObjects[0])) {
            this.profileObject = preSelectedObjects[0] as PolylineObject | SketchObject;
            this.app.setSelectedObjectId(this.profileObject.id);
            this.step = 'selectPath';
            this.app.commandLineController.setPrompt(this.i18n.t('command.sweep.selectPath'));
        } else {
            this.app.setSelectedObjectIds([]);
            this.step = 'selectProfile';
            this.app.commandLineController.setPrompt(this.i18n.t('command.sweep.selectProfile'));
        }
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
        this.step = 'selectProfile';
        this.profileObject = null;
    }
    
    private isValidProfile(obj: SceneObject | null): obj is PolylineObject | SketchObject {
        if (!obj) return false;
        if (obj instanceof PolylineObject && obj.isClosed) return true;
        if (obj instanceof SketchObject) return true;
        return false;
    }

    private isValidPath(obj: SceneObject | null): obj is PolylineObject | SketchObject {
         if (!obj) return false;
        if (obj instanceof PolylineObject && !obj.isClosed) return true;
        if (obj instanceof SketchObject) return true; 
        return false;
    }

    onMouseDown(point: Point, event: MouseEvent): void {
        const tolerance = 5 / this.app.canvasController.zoom;
        // FIX: Use sceneService to access objects.
        const clickedObject = [...this.app.sceneService.objects].reverse().find(obj => obj.contains(point, tolerance, this.app));
        
        if (this.step === 'selectProfile') {
            if (!this.isValidProfile(clickedObject)) {
                LogService.warn('Invalid selection for SWEEP profile.');
                this.app.commandLineController.setPrompt(this.i18n.t('command.sweep.invalidProfile'));
                return;
            }
            this.profileObject = clickedObject;
            this.app.setSelectedObjectId(clickedObject.id);
            this.step = 'selectPath';
            this.app.commandLineController.setPrompt(this.i18n.t('command.sweep.selectPath'));
        } else if (this.step === 'selectPath' && this.profileObject) {
            if (!this.isValidPath(clickedObject)) {
                 LogService.warn('Invalid selection for SWEEP path.');
                 this.app.commandLineController.setPrompt(this.i18n.t('command.sweep.invalidPath'));
                 return;
            }
            const pathObject = clickedObject;
            if (pathObject.id === this.profileObject.id) return;

            // Perform the sweep
            this.profileObject.isHidden = true;
            pathObject.isHidden = true;

            // FIX: Use sceneService for getting next ID.
            const sweepResult = new SweepObject(this.app.sceneService.getNextId(), this.profileObject.id, pathObject.id);
            
            this.app.addSceneObject(sweepResult, false);
            // FIX: Use projectStateService for history.
            this.app.projectStateService.commit(`Sweep profile ${this.profileObject.id} along path ${pathObject.id}`);
            this.app.setSelectedObjectId(sweepResult.id);
            
            this.app.toggle3dView(true);
            this.finish();
        }
    }

    onMouseMove(point: Point, event: MouseEvent): void {}
    onMouseUp(point: Point, event: MouseEvent): void {}
    onKeyDown(event: KeyboardEvent): void {}
    onKeyUp(event: KeyboardEvent): void {}
    onContextMenu(worldPoint: Point, screenPoint: Point): void { this.cancel(); }
    drawOverlay(ctx: CanvasRenderingContext2D, zoom: number): void {}
    activate(): void {}
    deactivate(): void { this.cancel(); }
    getCursor(): string { return 'crosshair'; }
}
