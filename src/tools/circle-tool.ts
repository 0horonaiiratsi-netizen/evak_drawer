/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "../app";
import { Point } from "../scene/point";
import { Tool, ToolType } from "./tool";
import { distance, findClosestSnapPoint } from "../utils/geometry";
import { CircleObject } from "../scene/circle-object";
import { OBJECT_SNAP_DISTANCE } from "../constants";
import { SnapResult } from "../snapping";
import { drawSnapIndicator } from "../utils/snap-indicator-drawer";

export class CircleTool extends Tool {
    private isDrawing = false;
    private centerPoint: Point | null = null;
    private previewCircle: CircleObject | null = null;
    private activeSnap: SnapResult | null = null;

    constructor(app: App) {
        super(app, ToolType.CIRCLE);
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

    onMouseDown(point: Point, event: MouseEvent): void {
        this.isDrawing = true;
        this.centerPoint = this.getSnappedPoint(point);
    }
    
    onMouseMove(point: Point, event: MouseEvent): void {
        if (!this.isDrawing || !this.centerPoint) return;
        
        const snappedPoint = this.getSnappedPoint(point);
        const radius = distance(this.centerPoint, snappedPoint);
        this.previewCircle = new CircleObject(0, this.centerPoint, radius);
    }

    onMouseUp(point: Point, event: MouseEvent): void {
        if (!this.isDrawing || !this.centerPoint) return;

        const snappedPoint = this.getSnappedPoint(point);
        const radius = distance(this.centerPoint, snappedPoint);

        if (radius > 1) { // Avoid creating tiny circles
            // FIX: Use sceneService for getting next ID.
            const newCircle = new CircleObject(this.app.sceneService.getNextId(), this.centerPoint, radius);
            this.app.addSceneObject(newCircle);
            this.app.setSelectedObjectId(newCircle.id);
        }
        
        this.reset();
    }

    onContextMenu(worldPoint: Point, screenPoint: Point): void {
        this.reset();
        this.app.setActiveTool(ToolType.SELECT);
    }

    private reset(): void {
        this.isDrawing = false;
        this.centerPoint = null;
        this.previewCircle = null;
        this.activeSnap = null;
    }
    
    deactivate(): void {
        this.reset();
        this.app.draw();
    }
    
    drawOverlay(ctx: CanvasRenderingContext2D, zoom: number): void {
        if (this.previewCircle) {
            // FIX: Expected 5 arguments, but got 3. Adding missing arguments.
            this.previewCircle.draw(ctx, false, zoom, [], this.app);
        }
        drawSnapIndicator(ctx, this.activeSnap, zoom);
    }

    getCursor(): string {
        return 'crosshair';
    }
}
