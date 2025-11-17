/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "../app";
import { Command } from "./command";
import { SceneObject } from "../scene/scene-object";
import { ToolType } from "../tools/tool";
import { I18nService } from "../i18n";
import { PolylineObject } from "../scene/polyline-object";
import { SketchObject } from "../scene/sketch-object";
import { RevolveObject } from "../scene/revolve-object";
import { Point } from "../scene/point";
import { distance, findClosestSnapPoint } from "../utils/geometry";
import { OBJECT_SNAP_DISTANCE } from "../constants";
import { SnapResult } from "../snapping";
import { drawSnapIndicator } from "../utils/snap-indicator-drawer";

/**
 * A command to create a 3D revolved object from a selected 2D shape.
 */
export class RevolveCommand implements Command {
    app: App;
    i18n: I18nService;
    type: ToolType = ToolType.REVOLVE;
    
    private step: 'selectAxisStart' | 'selectAxisEnd' = 'selectAxisStart';
    private profile: PolylineObject | SketchObject | null = null;
    private axisStart: Point | null = null;
    private activeSnap: SnapResult | null = null;

    /**
     * @param app The main application instance.
     */
    constructor(app: App) {
        this.app = app;
        this.i18n = app.i18n;
    }

    async start(preSelectedObjects: SceneObject[] = []): Promise<void> {
        this.reset();
        const sourceObject = preSelectedObjects[0];

        if (preSelectedObjects.length !== 1 || !sourceObject) {
            await this.app.dialogController.alert(this.i18n.t('toolbar.modification.revolve'), "Будь ласка, виберіть одну полілінію або ескіз для обертання.");
            this.finish();
            return;
        }

        const isValidObject = (sourceObject instanceof PolylineObject) || (sourceObject instanceof SketchObject);
        if (!isValidObject) {
            await this.app.dialogController.alert(this.i18n.t('toolbar.modification.revolve'), "Невірний об'єкт. Будь ласка, виберіть полілінію або ескіз.");
            this.finish();
            return;
        }
        
        this.profile = sourceObject;
        this.step = 'selectAxisStart';
        this.app.commandLineController.setPrompt("Вкажіть початкову точку осі обертання:");
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
        this.app.canvasController.setPreviewLine(null);
        this.app.draw();
    }
    
    private reset(): void {
        this.step = 'selectAxisStart';
        this.profile = null;
        this.axisStart = null;
        this.activeSnap = null;
    }

    async onMouseDown(point: Point, event: MouseEvent): Promise<void> {
        const snappedPoint = this.getSnappedPoint(point);

        if (this.step === 'selectAxisStart') {
            this.axisStart = snappedPoint;
            this.step = 'selectAxisEnd';
            this.app.commandLineController.setPrompt("Вкажіть кінцеву точку осі обертання:");
        } else if (this.step === 'selectAxisEnd' && this.axisStart && this.profile) {
            const axisEnd = snappedPoint;
            
            const angleStr = await this.app.dialogController.prompt("Обертання", "Введіть кут обертання (градуси):", "360");
            const angleDeg = parseFloat(angleStr || '');
            if (isNaN(angleDeg)) {
                this.cancel();
                return;
            }
            const angleRad = angleDeg * Math.PI / 180;

            // FIX: Use sceneService to get the next object ID.
            const newRevolveObject = new RevolveObject(this.app.sceneService.getNextId(), this.profile.id, this.axisStart, axisEnd, angleRad);
            this.app.addSceneObject(newRevolveObject, false);
            // FIX: Use projectStateService for history.
            this.app.projectStateService.commit(`Revolve object ${this.profile.id}`);
            this.app.setSelectedObjectId(newRevolveObject.id);
            
            this.app.toggle3dView(true);
            this.finish();
        }
    }

    onMouseMove(point: Point, event: MouseEvent): void {
        const snappedPoint = this.getSnappedPoint(point);
        if (this.step === 'selectAxisEnd' && this.axisStart) {
            this.app.canvasController.setPreviewLine(this.axisStart, snappedPoint);
        }
    }

    drawOverlay(ctx: CanvasRenderingContext2D, zoom: number): void {
        if (this.activeSnap) {
            drawSnapIndicator(ctx, this.activeSnap, zoom);
        }
    }

    private getSnappedPoint(point: Point): Point {
        this.activeSnap = null;
        if (this.app.snapModes.size > 0) {
            const tolerance = OBJECT_SNAP_DISTANCE / this.app.canvasController.zoom;
            // FIX: Use sceneService to access objects.
            const snapResult = findClosestSnapPoint(point, this.app.sceneService.objects, tolerance, this.app.snapModes);
            if (snapResult) {
                this.activeSnap = snapResult;
                return snapResult.point;
            }
        }
        return point;
    }

    // --- Unused/Placeholder Tool/Command Methods ---
    onMouseUp(point: Point, event: MouseEvent): void {}
    onKeyDown(event: KeyboardEvent): void { if (event.key === 'Enter') this.finish(); }
    onKeyUp(event: KeyboardEvent): void {}
    onContextMenu(worldPoint: Point, screenPoint: Point): void { this.cancel(); }
    activate(): void {}
    deactivate(): void { this.cancel(); }
    getCursor(): string { return 'crosshair'; }
}
