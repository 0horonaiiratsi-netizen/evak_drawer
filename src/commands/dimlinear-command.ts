/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "../app";
import { Command } from "./command";
import { Point } from "../scene/point";
import { ToolType } from "../tools/tool";
import { OBJECT_SNAP_DISTANCE } from "../constants";
import { findClosestSnapPoint } from "../utils/geometry";
import { SnapResult } from "../snapping";
import { drawSnapIndicator } from "../utils/snap-indicator-drawer";
import { I18nService } from "../i18n";
import { SceneObject } from "../scene/scene-object";
import { LinearDimensionObject } from "../scene/linear-dimension-object";

export class DimlinearCommand implements Command {
    app: App;
    i18n: I18nService;
    type: ToolType = ToolType.DIMLINEAR;
    
    private step: number = 0;
    private points: Point[] = [];
    private previewObject: LinearDimensionObject | null = null;
    private activeSnap: SnapResult | null = null;

    constructor(app: App) {
        this.app = app;
        this.i18n = app.i18n;
    }
    
    start(preSelectedObjects?: SceneObject[]): void {
        this.app.setSelectedObjectIds([]);
        this.reset();
        this.step = 0;
        this.app.commandLineController.setPrompt(this.i18n.t('command.dimlinear.prompt.firstPoint'));
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
        this.step = 0;
        this.points = [];
        this.previewObject = null;
        this.activeSnap = null;
    }
    
    onMouseDown(point: Point, event: MouseEvent): void {
        const snappedPoint = this.getSnappedPoint(point);
        
        switch (this.step) {
            case 0:
                this.points.push(snappedPoint);
                this.step = 1;
                this.app.commandLineController.setPrompt(this.i18n.t('command.dimlinear.prompt.secondPoint'));
                break;
            case 1:
                this.points.push(snappedPoint);
                this.app.canvasController.setPreviewLine(null);
                this.step = 2;
                this.app.commandLineController.setPrompt(this.i18n.t('command.dimlinear.prompt.dimLine'));
                break;
            case 2:
                this.points.push(point); // No snap for dim line location
                this.createDimension();
                this.finish();
                break;
        }
    }

    private createDimension(): void {
        if (this.previewObject) {
            this.previewObject.id = this.app.sceneService.getNextId();
            this.app.addSceneObject(this.previewObject);
        }
    }
    
    onMouseMove(point: Point, event: MouseEvent): void {
        const snappedPoint = this.getSnappedPoint(point);
        switch (this.step) {
            case 1:
                this.app.canvasController.setPreviewLine(this.points[0], snappedPoint);
                break;
            case 2:
                const [p1, p2] = this.points;
                const dx = Math.abs(p1.x - p2.x);
                const dy = Math.abs(p1.y - p2.y);
                const isVertical = dy > dx;
                const styleName = this.app.styleManager.getCurrentDimensionStyleName();
                this.previewObject = new LinearDimensionObject(0, p1, p2, point, isVertical, styleName);
                break;
        }
        this.app.draw();
    }
    
    onMouseUp(point: Point, event: MouseEvent): void {}
    onKeyDown(event: KeyboardEvent): void { if (event.key === 'Enter') this.finish(); }
    onKeyUp(event: KeyboardEvent): void {}
    onContextMenu(worldPoint: Point, screenPoint: Point): void { this.cancel(); }
    
    drawOverlay(ctx: CanvasRenderingContext2D, zoom: number): void {
        if (this.previewObject) {
            this.previewObject.draw(ctx, false, zoom, this.app.sceneService.objects, this.app);
        }
        if (this.activeSnap) {
            drawSnapIndicator(ctx, this.activeSnap, zoom);
        }
    }
    
    private getSnappedPoint(point: Point): Point {
        this.activeSnap = null;
        if (this.app.snapModes.size > 0) {
            const tolerance = OBJECT_SNAP_DISTANCE / this.app.canvasController.zoom;
            const snapResult = findClosestSnapPoint(point, this.app.sceneService.objects, tolerance, this.app.snapModes);
            if (snapResult) {
                this.activeSnap = snapResult;
                return snapResult.point;
            }
        }
        return point;
    }
    
    activate(): void {}
    deactivate(): void { this.cancel(); }
    getCursor(): string { return 'crosshair'; }
}