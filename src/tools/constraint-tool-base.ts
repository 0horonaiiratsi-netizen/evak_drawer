/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "../app";
import { Point } from "../scene/point";
import { PolylineObject } from "../scene/polyline-object";
import { SELECTION_TOLERANCE } from "../constants";
import { distance } from "../utils/geometry";
import { Tool, ToolType } from "./tool";

export type SelectedSegment = { polyline: PolylineObject, index: number, p1: Point, p2: Point };

export abstract class TwoSegmentConstraintTool extends Tool {
    private step = 0;
    private firstSegment: SelectedSegment | null = null;
    
    constructor(app: App, type: ToolType) {
        super(app, type);
    }

    activate(): void {
        super.activate();
        this.reset();
    }

    onMouseDown(point: Point, event: MouseEvent): void {
        if (!this.app.isSketchMode || !this.app.sketchSolver) return;

        const segment = this.findSegmentAt(point);
        if (!segment) return;
        
        if (this.step === 0) {
            this.firstSegment = segment;
            this.step = 1;
            // TODO: Add prompt for second segment
        } else if (this.step === 1 && this.firstSegment) {
            if (this.firstSegment.polyline.id === segment.polyline.id && this.firstSegment.index === segment.index) {
                return;
            }
            this.applyConstraint(this.firstSegment, segment);
            this.reset(); // Reset to apply more constraints
        }
    }

    protected findSegmentAt(point: Point): SelectedSegment | null {
        const sketchObjects = this.app.sketchContext;
        const tolerance = SELECTION_TOLERANCE / this.app.canvasController.zoom;

        for (const obj of sketchObjects) {
            if (obj instanceof PolylineObject) {
                for (let i = 0; i < obj.points.length - 1; i++) {
                    const p1 = obj.points[i];
                    const p2 = obj.points[i + 1];
                    const dx = p2.x - p1.x;
                    const dy = p2.y - p1.y;
                    if (dx === 0 && dy === 0) continue;
                    const t = ((point.x - p1.x) * dx + (point.y - p1.y) * dy) / (dx * dx + dy * dy);
                    const clampedT = Math.max(0, Math.min(1, t));
                    const closestPointOnSegment = { x: p1.x + clampedT * dx, y: p1.y + clampedT * dy };
                    const dist = distance(point, closestPointOnSegment);

                    if (dist <= tolerance) {
                        return { polyline: obj, index: i, p1, p2 };
                    }
                }
            }
        }
        return null;
    }

    abstract applyConstraint(segment1: SelectedSegment, segment2: SelectedSegment): void;
    
    private reset(): void {
        this.step = 0;
        this.firstSegment = null;
        this.app.draw();
    }
    
    deactivate(): void {
        this.reset();
        super.deactivate();
    }
    
    getCursor(): string {
        return 'crosshair';
    }
}