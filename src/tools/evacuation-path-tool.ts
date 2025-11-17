/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "../app";
import { Point } from "../scene/point";
import { EvacuationPath } from "../scene/evacuation-path";
import { snapToGrid, snapToAngle, findClosestSnapPoint, snapToOrtho } from "../utils/geometry";
import { Tool, ToolType } from "./tool";
import { OBJECT_SNAP_DISTANCE } from "../constants";
import { SnapResult } from "../snapping";
import { drawSnapIndicator } from "../utils/snap-indicator-drawer";

export class EvacuationPathTool extends Tool {
    private isDrawing = false;
    private currentPoints: Point[] = [];
    private activeSnap: SnapResult | null = null;
    
    constructor(app: App) {
        super(app, ToolType.EVACUATION_PATH);
    }

    private getSnappedPoint(point: Point): Point {
        this.activeSnap = null;
        let snappedPoint = point;

        // 1. Ortho constraint if enabled
        if (this.app.isOrthoEnabled && this.isDrawing && this.currentPoints.length > 0) {
            const prevPoint = this.currentPoints[this.currentPoints.length - 1];
            snappedPoint = snapToOrtho(prevPoint, snappedPoint);
        }

        // 2. Object snapping (highest priority for final position)
        if (this.app.snapModes.size > 0) {
            const tolerance = OBJECT_SNAP_DISTANCE / this.app.canvasController.zoom;
            const snapResult = findClosestSnapPoint(snappedPoint, this.app.sceneService.objects, tolerance, this.app.snapModes);
            if (snapResult) {
                this.activeSnap = snapResult;
                return snapResult.point;
            }
        }

        // 3. Grid and Angle snapping
        if (this.app.isSnappingEnabled) {
            const gridSnapped = snapToGrid(snappedPoint);
            // Apply angle snapping only if Ortho is off
            if (!this.app.isOrthoEnabled && this.isDrawing && this.currentPoints.length > 0) {
                const prevPoint = this.currentPoints[this.currentPoints.length - 1];
                return snapToAngle(prevPoint, gridSnapped);
            }
            return gridSnapped;
        }

        return snappedPoint;
    }

    onMouseDown(point: Point, _event: MouseEvent): void {
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
        // Finish drawing on Enter key
        if (event.key === 'Enter' && this.isDrawing) {
            this.finalizePath();
        }
    }

    onContextMenu(worldPoint: Point, screenPoint: Point): void {
        if (this.isDrawing) {
            this.finalizePath();
            this.app.setActiveTool(ToolType.SELECT);
        }
    }

    private finalizePath(): void {
        this.app.canvasController.setPreviewLine(null);
        if (this.currentPoints.length >= 2) {
            const path = new EvacuationPath(this.app.sceneService.getNextId(), this.currentPoints);
            this.app.addSceneObject(path);
        }
        this.currentPoints = [];
        this.isDrawing = false;
        this.activeSnap = null;
    }

    deactivate(): void {
        this.finalizePath();
    }
    
    drawOverlay(ctx: CanvasRenderingContext2D, zoom: number): void {
        drawSnapIndicator(ctx, this.activeSnap, zoom);
    }

    getCursor(): string {
        return 'crosshair';
    }
}