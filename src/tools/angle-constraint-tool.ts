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
import { SelectedSegment } from "./constraint-tool-base";

export class AngleConstraintTool extends Tool {
    private step = 0;
    private firstSegment: SelectedSegment | null = null;

    constructor(app: App) {
        super(app, ToolType.ANGLE_CONSTRAINT);
    }
    
    activate(): void {
        super.activate();
        this.reset();
    }

    async onMouseDown(point: Point, event: MouseEvent): Promise<void> {
        if (!this.app.isSketchMode || !this.app.sketchSolver) return;

        const segment = this.findSegmentAt(point);
        if (!segment) return;
        
        if (this.step === 0) {
            this.firstSegment = segment;
            this.step = 1;
        } else if (this.step === 1 && this.firstSegment) {
            if (this.firstSegment.polyline.id === segment.polyline.id && this.firstSegment.index === segment.index) {
                return; // Can't constrain a segment to itself
            }
            
            const v1_x = this.firstSegment.p2.x - this.firstSegment.p1.x;
            const v1_y = this.firstSegment.p2.y - this.firstSegment.p1.y;
            const v2_x = segment.p2.x - segment.p1.x;
            const v2_y = segment.p2.y - segment.p1.y;
            const angle1 = Math.atan2(v1_y, v1_x);
            const angle2 = Math.atan2(v2_y, v2_x);
            let angleDiff = (angle2 - angle1) * 180 / Math.PI;
            // Normalize to [-180, 180]
            angleDiff = (angleDiff + 540) % 360 - 180;

            const angleStr = await this.app.dialogController.prompt(
                this.app.i18n.t('toolbar.sketch.constraintAngle'), 
                'Введіть бажаний кут у градусах:', 
                angleDiff.toFixed(2)
            );

            if (angleStr === null) {
                this.reset();
                return;
            };
            const angle = parseFloat(angleStr);
            if (isNaN(angle)) {
                this.reset();
                return;
            };

            this.applyConstraint(this.firstSegment, segment, angle);
            this.reset(); // Reset to apply more constraints
        }
    }

    private findSegmentAt(point: Point): SelectedSegment | null {
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

    applyConstraint(segment1: SelectedSegment, segment2: SelectedSegment, angleDegrees: number): void {
        if (!this.app.sketchSolver) return;
        
        const success = this.app.sketchSolver.addAngleConstraint(segment2.p1, segment2.p2, segment1.p1, segment1.p2, angleDegrees);
        if (success) {
            this.app.sketchSolver.solve();
            this.app.draw();
        } else {
            this.app.dialogController.alert('Помилка обмеження', 'Не вдалося застосувати кутове обмеження. Можливо, опорна лінія має нульову довжину.');
        }
    }
    
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