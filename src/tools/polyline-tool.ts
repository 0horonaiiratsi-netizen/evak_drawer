/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "../app";
import { Point } from "../scene/point";
import { PolylineObject } from "../scene/polyline-object";
import { snapToGrid, snapToAngle, findClosestSnapPoint, snapToOrtho } from "../utils/geometry";
import { Tool, ToolType } from "./tool";
import { OBJECT_SNAP_DISTANCE } from "../constants";
import { SnapResult } from "../snapping";
import { drawSnapIndicator } from "../utils/snap-indicator-drawer";

export class PolylineTool extends Tool {
    private isDrawing = false;
    private currentPoints: Point[] = [];
    private activeSnap: SnapResult | null = null;
    
    constructor(app: App) {
        super(app, ToolType.POLYLINE);
    }

    private getSnappedPoint(point: Point): Point {
        this.activeSnap = null;
        let snappedPoint = point;

        if (this.app.isOrthoEnabled && this.isDrawing && this.currentPoints.length > 0) {
            const prevPoint = this.currentPoints[this.currentPoints.length - 1];
            snappedPoint = snapToOrtho(prevPoint, snappedPoint);
        }

        if (this.app.snapModes.size > 0) {
            const tolerance = OBJECT_SNAP_DISTANCE / this.app.canvasController.zoom;
            // FIX: Use sceneService to access objects.
            const snapResult = findClosestSnapPoint(snappedPoint, this.app.sceneService.objects, tolerance, this.app.snapModes);
            if (snapResult) {
                this.activeSnap = snapResult;
                return snapResult.point;
            }
        }

        if (this.app.isSnappingEnabled) {
            const gridSnapped = snapToGrid(snappedPoint);
            if (!this.app.isOrthoEnabled && this.isDrawing && this.currentPoints.length > 0) {
                const prevPoint = this.currentPoints[this.currentPoints.length - 1];
                return snapToAngle(prevPoint, gridSnapped);
            }
            return gridSnapped;
        }

        return snappedPoint;
    }

    onMouseDown(point: Point, event: MouseEvent): void {
        const snappedPoint = this.getSnappedPoint(point);
        
        if (!this.isDrawing) {
            this.isDrawing = true;
            this.currentPoints.push(snappedPoint);
        } else {
            this.currentPoints.push(snappedPoint);
        }
    }
    
    onMouseMove(point: Point): void {
        const snappedPoint = this.getSnappedPoint(point);
        if (this.isDrawing && this.currentPoints.length > 0) {
            const prevPoint = this.currentPoints[this.currentPoints.length - 1];
            this.app.canvasController.setPreviewLine(prevPoint, snappedPoint);
        }
    }
    
    onKeyDown(event: KeyboardEvent): void {
        if (event.key === 'Enter' && this.isDrawing) {
            this.finalizePolyline();
        }
    }

    onContextMenu(worldPoint: Point, screenPoint: Point): void {
        if (this.isDrawing) {
            this.finalizePolyline();
            this.app.setActiveTool(ToolType.SELECT);
        }
    }

    private finalizePolyline(): void {
        this.app.canvasController.setPreviewLine(null);
        if (this.currentPoints.length >= 2) {
            // FIX: Use sceneService to get the next object ID.
            const polyline = new PolylineObject(this.app.sceneService.getNextId(), this.currentPoints);
            this.app.addSceneObject(polyline);
        }
        this.reset();
    }

    private reset(): void {
        this.currentPoints = [];
        this.isDrawing = false;
        this.activeSnap = null;
    }

    deactivate(): void {
        this.finalizePolyline();
    }
    
    drawOverlay(ctx: CanvasRenderingContext2D, zoom: number): void {
        drawSnapIndicator(ctx, this.activeSnap, zoom);
    }

    getCursor(): string {
        return 'crosshair';
    }
}
