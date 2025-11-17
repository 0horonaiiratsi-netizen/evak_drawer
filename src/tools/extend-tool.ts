/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "../app";
import { Point } from "../scene/point";
import { SceneObject } from "../scene/scene-object";
import { Wall } from "../scene/wall";
import { distance } from "../utils/geometry";
import { infiniteLineLineIntersection } from "../utils/intersections";
import { Tool, ToolType } from "./tool";

export class ExtendTool extends Tool {
    private boundaries: SceneObject[] = [];
    private previewExtendedWall: { wall: Wall, newPoint: Point, originalPoint: Point } | null = null;


    constructor(app: App) {
        super(app, ToolType.EXTEND);
    }
    
    async activate(): Promise<void> {
        super.activate();
        // FIX: Use sceneService and selectionService to access objects and selection.
        this.boundaries = this.app.sceneService.objects.filter(obj => this.app.selectionService.selectedIds.includes(obj.id));
        if (this.boundaries.length === 0) {
            await this.app.dialogController.alert("Подовжити", "Спочатку виділіть об'єкти, які будуть межами для подовження.");
            this.app.setActiveTool(ToolType.SELECT);
            return;
        }
        await this.app.dialogController.alert("Подовжити", "Тепер клацайте на кінці стін, які потрібно подовжити.");
    }

    onMouseDown(point: Point, event: MouseEvent): void {
        const tolerance = 10 / this.app.canvasController.zoom;
        const targetWall = this.findWallToModify(point, tolerance);
        if (!targetWall) return;

        const newPoint = this.calculateExtendedPoint(targetWall, point);
        if (!newPoint) return;

        const distToP1 = distance(point, targetWall.p1);
        const distToP2 = distance(point, targetWall.p2);

        if (distToP1 < distToP2) {
            targetWall.p1 = newPoint;
        } else {
            targetWall.p2 = newPoint;
        }

        // FIX: Use projectStateService for history.
        this.app.projectStateService.commit("Extend Object");
        this.app.draw();
    }
    
    onMouseMove(point: Point, event: MouseEvent): void {
        const tolerance = 10 / this.app.canvasController.zoom;
        const targetWall = this.findWallToModify(point, tolerance);
        this.previewExtendedWall = null;

        if (targetWall) {
            const newPoint = this.calculateExtendedPoint(targetWall, point);
            if (newPoint) {
                 const distToP1 = distance(point, targetWall.p1);
                 const distToP2 = distance(point, targetWall.p2);
                 const originalPoint = distToP1 < distToP2 ? targetWall.p1 : targetWall.p2;
                 this.previewExtendedWall = { wall: targetWall, newPoint, originalPoint };
            }
        }
        this.app.draw();
    }

    private findWallToModify(point: Point, tolerance: number): Wall | null {
         // FIX: Use sceneService to access objects.
         return this.app.sceneService.objects.find(obj =>
            obj instanceof Wall &&
            this.boundaries.some(b => b.id === obj.id) &&
            // Check if click is near an endpoint
            (distance(point, obj.p1) < tolerance || distance(point, obj.p2) < tolerance)
        ) as Wall | null;
    }

    private calculateExtendedPoint(targetWall: Wall, clickPoint: Point): Point | null {
        const endToExtend = distance(clickPoint, targetWall.p1) < distance(clickPoint, targetWall.p2) ? 'p1' : 'p2';
        const otherEnd = endToExtend === 'p1' ? targetWall.p2 : targetWall.p1;
        const startPoint = targetWall[endToExtend];

        const candidateIntersections: Point[] = [];

        for (const boundary of this.boundaries) {
            if (boundary.id === targetWall.id) continue;
            if (boundary instanceof Wall) {
                const intersection = infiniteLineLineIntersection(targetWall.p1, targetWall.p2, boundary.p1, boundary.p2);
                if (intersection) {
                    // Check if the intersection is on the boundary *segment*
                    const dx = boundary.p2.x - boundary.p1.x;
                    const dy = boundary.p2.y - boundary.p1.y;
                    const lenSq = dx*dx + dy*dy;
                    if (lenSq === 0) continue;

                    const t = ((intersection.x - boundary.p1.x) * dx + (intersection.y - boundary.p1.y) * dy) / lenSq;
                    
                    if (t >= 0 && t <= 1) {
                        // Check if intersection is "beyond" the endpoint
                        if (distance(otherEnd, intersection) > distance(otherEnd, startPoint)) {
                            candidateIntersections.push(intersection);
                        }
                    }
                }
            }
        }
        
        if (candidateIntersections.length === 0) return null;

        // Find the closest valid intersection to the endpoint we're extending
        return candidateIntersections.sort((a, b) => distance(startPoint, a) - distance(startPoint, b))[0];
    }
    
    drawOverlay(ctx: CanvasRenderingContext2D, zoom: number): void {
        if (this.previewExtendedWall) {
            const { wall, newPoint, originalPoint } = this.previewExtendedWall;
            ctx.save();
            ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--selected-stroke-color');
            ctx.lineWidth = wall.thickness;
            ctx.globalAlpha = 0.5;
            ctx.setLineDash([6 / zoom, 4 / zoom]);
            
            ctx.beginPath();
            ctx.moveTo(originalPoint.x, originalPoint.y);
            ctx.lineTo(newPoint.x, newPoint.y);
            ctx.stroke();

            ctx.restore();
        }
    }


    // FIX: Implement abstract member 'getCursor'.
    getCursor(): string {
        return 'crosshair';
    }
}