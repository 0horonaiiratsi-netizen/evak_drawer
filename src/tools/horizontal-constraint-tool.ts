/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "../app";
import { Point } from "../scene/point";
import { Tool, ToolType } from "./tool";
import { SELECTION_TOLERANCE } from "../constants";
import { PolylineObject } from "../scene/polyline-object";
import { distance } from "../utils/geometry";

export class HorizontalConstraintTool extends Tool {
    constructor(app: App) {
        super(app, ToolType.HORIZONTAL_CONSTRAINT);
    }

    onMouseDown(point: Point, event: MouseEvent): void {
        if (!this.app.isSketchMode || !this.app.sketchSolver) return;

        const sketchObjects = this.app.sketchContext;
        const tolerance = SELECTION_TOLERANCE / this.app.canvasController.zoom;

        const targetPolyline = sketchObjects.find(obj => 
            obj instanceof PolylineObject && obj.contains(point, tolerance)
        ) as PolylineObject | undefined;

        if (!targetPolyline) {
            return;
        }

        let closestSegmentIndex = -1;
        let minDistance = Infinity;

        for (let i = 0; i < targetPolyline.points.length - 1; i++) {
            const p1 = targetPolyline.points[i];
            const p2 = targetPolyline.points[i + 1];
            
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            if (dx === 0 && dy === 0) continue;
            const t = ((point.x - p1.x) * dx + (point.y - p1.y) * dy) / (dx * dx + dy * dy);
            const clampedT = Math.max(0, Math.min(1, t));
            const closestPointOnSegment = { x: p1.x + clampedT * dx, y: p1.y + clampedT * dy };
            const dist = distance(point, closestPointOnSegment);

            if (dist < minDistance) {
                minDistance = dist;
                closestSegmentIndex = i;
            }
        }

        if (closestSegmentIndex !== -1) {
            const p1 = targetPolyline.points[closestSegmentIndex];
            const p2 = targetPolyline.points[closestSegmentIndex + 1];

            this.app.sketchSolver.addHorizontalConstraint(p1, p2);
            this.app.sketchSolver.solve();
            
            this.app.draw();
            // TODO: Add a constraint visual object to the sketch.
        }
    }
    
    getCursor(): string {
        return 'crosshair';
    }
}