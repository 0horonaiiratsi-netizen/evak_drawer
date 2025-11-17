/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "../app";
import { Point } from "../scene/point";
import { PolylineObject } from "../scene/polyline-object";
import { Wall } from "../scene/wall";
import { distance } from "../utils/geometry";
import { infiniteLineLineIntersection, normalizeVector } from "../utils/intersections";
import { Tool, ToolType } from "./tool";

export class ChamferTool extends Tool {
    private step = 0;
    private distance1: number | null = null;
    private distance2: number | null = null;
    private firstWall: Wall | null = null;

    constructor(app: App) {
        super(app, ToolType.CHAMFER);
    }

    async activate(): Promise<void> {
        super.activate();
        this.reset();
        const dist1Str = await this.app.dialogController.prompt("Фаска", "Введіть першу відстань фаски:", "10");
        const dist1 = parseFloat(dist1Str || '');
        if (isNaN(dist1) || dist1 < 0) {
            this.app.setActiveTool(ToolType.SELECT);
            return;
        }
        
        const dist2Str = await this.app.dialogController.prompt("Фаска", `Введіть другу відстань фаски (або Enter для ${dist1}):`, dist1Str || '10');
        const dist2 = parseFloat(dist2Str || '');
         if (isNaN(dist2) || dist2 < 0) {
            this.app.setActiveTool(ToolType.SELECT);
            return;
        }

        this.distance1 = dist1;
        this.distance2 = dist2;
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
            this.app.dialogController.alert("Фаска", "Виберіть другий об'єкт.");
        } else if (this.step === 1 && this.firstWall && this.firstWall.id !== targetWall.id) {
            this.createChamfer(this.firstWall, targetWall);
            this.resetAndSwitchToSelect();
        }
    }

    private createChamfer(wall1: Wall, wall2: Wall) {
        if (this.distance1 === null || this.distance2 === null) return;

        const intersection = infiniteLineLineIntersection(wall1.p1, wall1.p2, wall2.p1, wall2.p2);
        if (!intersection) {
            this.app.dialogController.alert("Помилка", "Лінії паралельні, фаска неможлива.");
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

        // Calculate the new endpoints for the walls
        const newW1End = { x: intersection.x + v1.x * this.distance1, y: intersection.y + v1.y * this.distance1 };
        const newW2End = { x: intersection.x + v2.x * this.distance2, y: intersection.y + v2.y * this.distance2 };

        // Modify the original walls
        if (w1End === wall1.p1) wall1.p1 = newW1End; else wall1.p2 = newW1End;
        if (w2End === wall2.p1) wall2.p1 = newW2End; else wall2.p2 = newW2End;

        // Create the chamfer line
        const chamferLine = new PolylineObject(this.app.sceneService.getNextId(), [newW1End, newW2End]);

        this.app.addSceneObject(chamferLine, false);
        this.app.projectStateService.commit("Create Chamfer");
    }

    protected reset(): void {
        this.step = 0;
        this.distance1 = null;
        this.distance2 = null;
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