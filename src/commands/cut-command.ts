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
import { CutObject } from "../scene/cut-object";
import { ExtrudeObject } from "../scene/extrude-object";
import { RevolveObject } from "../scene/revolve-object";
import { LogService } from "../services/logger";

export class CutCommand implements Command {
    app: App;
    i18n: I18nService;
    // FIX: Property 'CUT' does not exist on type 'typeof ToolType'. This is fixed by adding CUT to the ToolType enum.
    type: ToolType = ToolType.CUT;
    
    private step: 'selectTarget' | 'selectTool' = 'selectTarget';
    private targetObject: SceneObject | null = null;

    constructor(app: App) {
        this.app = app;
        this.i18n = app.i18n;
    }

    start(preSelectedObjects: SceneObject[] = []): void {
        this.reset();
        this.app.setSelectedObjectIds([]);
        this.step = 'selectTarget';
        this.app.commandLineController.setPrompt(this.i18n.t('command.cut.selectTarget'));
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
        this.step = 'selectTarget';
        this.targetObject = null;
    }
    
    private isValidSelection(obj: SceneObject | null): obj is ExtrudeObject | RevolveObject | CutObject {
        return !!obj && (obj instanceof ExtrudeObject || obj instanceof RevolveObject || obj instanceof CutObject);
    }

    onMouseDown(point: Point, event: MouseEvent): void {
        const tolerance = 5 / this.app.canvasController.zoom;
        // FIX: Use sceneService to access objects.
        const clickedObject = [...this.app.sceneService.objects].reverse().find(obj => obj.contains(point, tolerance, this.app));
        
        if (!this.isValidSelection(clickedObject)) {
            LogService.warn('Invalid selection for CUT command.');
            this.app.commandLineController.setPrompt(this.i18n.t('command.cut.invalidSelection'));
            return;
        }

        if (this.step === 'selectTarget') {
            this.targetObject = clickedObject;
            this.app.setSelectedObjectId(clickedObject.id);
            this.step = 'selectTool';
            this.app.commandLineController.setPrompt(this.i18n.t('command.cut.selectTool'));
        } else if (this.step === 'selectTool' && this.targetObject) {
            const toolObject = clickedObject;
            if (toolObject.id === this.targetObject.id) return;

            // Perform the cut
            // FIX: Property 'isHidden' does not exist on type 'CutObject | ExtrudeObject | RevolveObject'. This is fixed by adding the property to the respective classes.
            this.targetObject.isHidden = true;
            toolObject.isHidden = true;

            // FIX: Use sceneService for getting next ID.
            const cutResult = new CutObject(this.app.sceneService.getNextId(), this.targetObject.id, toolObject.id);
            
            this.app.addSceneObject(cutResult, false); // Record history in one go
            // FIX: Use projectStateService for history.
            this.app.projectStateService.commit(`Cut object ${toolObject.id} from ${this.targetObject.id}`);
            this.app.setSelectedObjectId(cutResult.id);
            
            // Automatically switch to 3D view to show the result.
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