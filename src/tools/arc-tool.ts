/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "../app";
import { Point } from "../scene/point";
import { Tool, ToolType } from "./tool";
import { getCircleCenterFromThreePoints, findClosestSnapPoint, distance } from "../utils/geometry";
import { ArcObject } from "../scene/arc-object";
import { OBJECT_SNAP_DISTANCE } from "../constants";
import { SnapResult } from "../snapping";
import { drawSnapIndicator } from "../utils/snap-indicator-drawer";

export class ArcTool extends Tool {
    private step = 0;
    private points: Point[] = [];
    private previewArc: ArcObject | null = null;
    private activeSnap: SnapResult | null = null;

    constructor(app: App) {
        super(app, ToolType.ARC);
    }
    
    activate(): void {
        super.activate();
        this.reset();
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
        const snappedPoint = this.getSnappedPoint(point);
        this.points.push(snappedPoint);
        this.step++;

        if (this.step === 3) {
            this.finalizeArc();
        }
    }

    onMouseMove(point: Point, event: MouseEvent): void {
        if (this.step === 0) return;
        const snappedPoint = this.getSnappedPoint(point);

        if (this.step === 1) {
            this.app.canvasController.setPreviewLine(this.points[0], snappedPoint);
        } else if (this.step === 2) {
            this.app.canvasController.setPreviewLine(null);
            this.updatePreviewArc(snappedPoint);
        }
    }

    onContextMenu(worldPoint: Point, screenPoint: Point): void {
        this.finalizeArc();
        this.app.setActiveTool(ToolType.SELECT);
    }

    private updatePreviewArc(p3: Point) {
        const [p1, p2] = this.points;
        const center = getCircleCenterFromThreePoints(p1, p2, p3);

        if (center) {
            const radius = distance(center, p1);
            const startAngle = Math.atan2(p1.y - center.y, p1.x - center.x);
            const endAngle = Math.atan2(p3.y - center.y, p3.x - center.x);
            
            // Determine drawing direction (counter-clockwise or not)
            const crossProduct = (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
            const counterClockwise = crossProduct < 0;

            this.previewArc = new ArcObject(0, center, radius, startAngle, endAngle, counterClockwise);
        } else {
            this.previewArc = null;
        }
    }

    private finalizeArc(): void {
        if (this.previewArc) {
            // FIX: Use sceneService for getting next ID.
            this.previewArc.id = this.app.sceneService.getNextId();
            this.app.addSceneObject(this.previewArc);
        }
        this.reset();
    }

    private reset(): void {
        this.step = 0;
        this.points = [];
        this.previewArc = null;
        this.activeSnap = null;
        this.app.canvasController.setPreviewLine(null);
    }
    
    deactivate(): void {
        this.reset();
        this.app.draw();
    }

    drawOverlay(ctx: CanvasRenderingContext2D, zoom: number): void {
        if (this.previewArc) {
            // FIX: Expected 5 arguments, but got 3. Adding missing arguments.
            this.previewArc.draw(ctx, false, zoom, [], this.app);
        }
        drawSnapIndicator(ctx, this.activeSnap, zoom);
    }

    getCursor(): string {
        return 'crosshair';
    }
}
