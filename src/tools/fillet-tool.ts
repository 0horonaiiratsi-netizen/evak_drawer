/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "../app";
import { Point } from "../scene/point";
import { ArcObject } from "../scene/arc-object";
import { Wall } from "../scene/wall";
import { distance } from "../utils/geometry";
import { infiniteLineLineIntersection, normalizeVector } from "../utils/intersections";
import { Tool, ToolType } from "./tool";

export class FilletTool extends Tool {
    private step = 0;
    private radius: number | null = null;
    private firstWall: Wall | null = null;

    constructor(app: App) {
        super(app, ToolType.FILLET);
    }
    
    async activate(): Promise<void> {
        super.activate();
        this.reset();
        const radiusStr = await this.app.dialogController.prompt("Скруглення", "Введіть радіус скруглення:", "20");
        const radius = parseFloat(radiusStr || '');

        if (isNaN(radius) || radius <= 0) {
            this.app.setActiveTool(ToolType.SELECT);
            return;
        }
        this.radius = radius;
        this.step = 0;
    }

    onMouseDown(point: Point, event: MouseEvent): void {
        const tolerance = 5 / this.app.canvasController.zoom;
        const targetWall = this.app.sceneService.objects.find(obj => 
            obj instanceof Wall && obj.contains(point, tolerance)
        ) as Wall | undefined;

        if (!targetWall) return;
        
        if (this.step === 0) {
            this.firstWall = targetWall;
            this.step = 1;
            this.app.dialogController.alert("Скруглення", "Виберіть другий об'єкт.");
        } else if (this.step === 1 && this.firstWall && this.firstWall.id !== targetWall.id) {
            this.createFillet(this.firstWall, targetWall);
            this.resetAndSwitchToSelect();
        }
    }

    private createFillet(wall1: Wall, wall2: Wall) {
        if (!this.radius) return;

        const intersection = infiniteLineLineIntersection(wall1.p1, wall1.p2, wall2.p1, wall2.p2);
        if (!intersection) {
            this.app.dialogController.alert("Помилка", "Лінії паралельні, скруглення неможливе.");
            return;
        }

        // Determine which ends of the walls are closer to the intersection
        const w1End = distance(wall1.p1, intersection) < distance(wall1.p2, intersection) ? wall1.p1 : wall1.p2;
        const w1OtherEnd = w1End === wall1.p1 ? wall1.p2 : wall1.p1;
        const w2End = distance(wall2.p1, intersection) < distance(wall2.p2, intersection) ? wall2.p1 : wall2.p2;
        const w2OtherEnd = w2End === wall2.p1 ? wall2.p2 : wall2.p1;

        // Create normalized vectors from the intersection towards the ends we are keeping
        const v1 = normalizeVector({ x: w1OtherEnd.x - intersection.x, y: w1OtherEnd.y - intersection.y });
        const v2 = normalizeVector({ x: w2OtherEnd.x - intersection.x, y: w2OtherEnd.y - intersection.y });

        const dot = v1.x * v2.x + v1.y * v2.y;
        if (Math.abs(dot) > 1 - 1e-9) return; // Parallel check

        const angle = Math.acos(dot);
        const trimDist = this.radius / Math.tan(angle / 2);

        // Calculate the new endpoints for the walls
        const newW1End = { x: intersection.x + v1.x * trimDist, y: intersection.y + v1.y * trimDist };
        const newW2End = { x: intersection.x + v2.x * trimDist, y: intersection.y + v2.y * trimDist };

        // Determine the arc center
        const bisector = normalizeVector({ x: v1.x + v2.x, y: v1.y + v2.y });
        const centerDist = this.radius / Math.sin(angle / 2);
        
        let arcCenter = { x: intersection.x + bisector.x * centerDist, y: intersection.y + bisector.y * centerDist };
        
        // Ensure arc center is on the correct side
        const crossProduct = (w1End.x - intersection.x) * (w2End.y - intersection.y) - (w1End.y - intersection.y) * (w2End.x - intersection.x);
        const centerCrossProduct = (newW1End.x - intersection.x) * (arcCenter.y - intersection.y) - (newW1End.y - intersection.y) * (arcCenter.x - intersection.x);
        if (Math.sign(crossProduct) !== Math.sign(centerCrossProduct)) {
            arcCenter = { x: intersection.x - bisector.x * centerDist, y: intersection.y - bisector.y * centerDist };
        }
        
        const startAngle = Math.atan2(newW1End.y - arcCenter.y, newW1End.x - arcCenter.x);
        const endAngle = Math.atan2(newW2End.y - arcCenter.y, newW2End.x - arcCenter.x);

        // Determine drawing direction
        const arcMidPoint = {x: intersection.x, y: intersection.y};
        const cross = (arcMidPoint.x - newW1End.x) * (newW2End.y - newW1End.y) - (arcMidPoint.y - newW1End.y) * (newW2End.x - newW1End.x);
        const counterClockwise = cross < 0;

        // Modify the original walls
        if (w1End === wall1.p1) wall1.p1 = newW1End; else wall1.p2 = newW1End;
        if (w2End === wall2.p1) wall2.p1 = newW2End; else wall2.p2 = newW2End;
        
        const newArc = new ArcObject(this.app.sceneService.getNextId(), arcCenter, this.radius, startAngle, endAngle, counterClockwise);
        
        this.app.addSceneObject(newArc, false);
        this.app.projectStateService.commit("Create Fillet");
    }

    protected reset(): void {
        this.step = 0;
        this.radius = null;
        this.firstWall = null;
    }

    protected resetAndSwitchToSelect(): void {
        this.reset();
        this.app.setActiveTool(ToolType.SELECT);
    }
    
    deactivate(): void {
        this.reset();
    }

    getCursor(): string {
        return 'crosshair';
    }
}