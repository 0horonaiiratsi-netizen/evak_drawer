/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "../app";
import { Point } from "../scene/point";
import { SceneObject } from "../scene/scene-object";
import { Wall } from "../scene/wall";
import { distance } from "../utils/geometry";
import { lineLineIntersection } from "../utils/intersections";
import { Tool, ToolType } from "./tool";

export class TrimTool extends Tool {
    private boundaries: SceneObject[] = [];
    private previewTrim: { wall: Wall, originalEndPoint: Point, newEndPoint: Point } | null = null;

    constructor(app: App) {
        super(app, ToolType.TRIM);
    }

    async activate(): Promise<void> {
        super.activate();
        this.reset();

        // FIX: Use sceneService and selectionService to access objects and selection.
        this.boundaries = this.app.sceneService.objects.filter(obj => this.app.selectionService.selectedIds.includes(obj.id));

        if (this.boundaries.length === 0) {
            await this.app.dialogController.alert("Обрізати", "Спочатку виділіть об'єкти, які будуть ріжучими кромками, а потім активуйте інструмент.");
            this.app.setActiveTool(ToolType.SELECT);
            return;
        }

        this.app.setSelectedObjectIds([]);
        await this.app.dialogController.alert("Обрізати", "Тепер клацайте на сегменти об'єктів, які потрібно обрізати.");
    }

    onMouseDown(point: Point, event: MouseEvent): void {
        if (!this.previewTrim) return;

        const { wall, newEndPoint, originalEndPoint } = this.previewTrim;
        
        // Modify the actual wall object
        if (wall.p1 === originalEndPoint) {
            wall.p1 = newEndPoint;
        } else {
            wall.p2 = newEndPoint;
        }

        // FIX: Use projectStateService for history.
        this.app.projectStateService.commit("Trim Object");
        this.previewTrim = null; // Clear preview so it's not redrawn
        this.app.draw();
    }

    onMouseMove(point: Point, event: MouseEvent): void {
        const tolerance = 5 / this.app.canvasController.zoom;
        const targetWall = this.findWallToModify(point, tolerance);
        this.previewTrim = null;

        if (targetWall) {
            const intersections = this.getIntersectionsForWall(targetWall);
            if (intersections.length > 0) {
                const distToP1 = distance(point, targetWall.p1);
                const distToP2 = distance(point, targetWall.p2);

                if (distToP1 < distToP2) {
                    // Trimming the p1 end
                    const potentialNewPoints = intersections.filter(p => distance(p, targetWall.p2) < distance(targetWall.p1, targetWall.p2));
                    if (potentialNewPoints.length > 0) {
                        potentialNewPoints.sort((a, b) => distance(a, targetWall.p1) - distance(b, targetWall.p1));
                        this.previewTrim = {
                            wall: targetWall,
                            originalEndPoint: targetWall.p1,
                            newEndPoint: potentialNewPoints[0]
                        };
                    }
                } else {
                    // Trimming the p2 end
                    const potentialNewPoints = intersections.filter(p => distance(p, targetWall.p1) < distance(targetWall.p1, targetWall.p2));
                    if (potentialNewPoints.length > 0) {
                        potentialNewPoints.sort((a, b) => distance(a, targetWall.p2) - distance(b, targetWall.p2));
                        this.previewTrim = {
                            wall: targetWall,
                            originalEndPoint: targetWall.p2,
                            newEndPoint: potentialNewPoints[0]
                        };
                    }
                }
            }
        }
        this.app.draw();
    }

    private findWallToModify(point: Point, tolerance: number): Wall | null {
        // Find a wall under the cursor that isn't locked.
        // FIX: Use sceneService and layerService.
        return this.app.sceneService.objects.find(obj =>
            obj instanceof Wall &&
            !this.app.layerService.getLayerForObject(obj.id)?.isLocked &&
            obj.contains(point, tolerance)
        ) as Wall | null;
    }

    private getIntersectionsForWall(targetWall: Wall): Point[] {
        const intersections: Point[] = [];
        for (const boundary of this.boundaries) {
            if (boundary.id === targetWall.id) continue;

            if (boundary instanceof Wall) {
                const intersection = lineLineIntersection(targetWall.p1, targetWall.p2, boundary.p1, boundary.p2);
                if (intersection) {
                    intersections.push(intersection);
                }
            }
            // Future: Support trimming to polylines, circles, etc.
        }
        return intersections;
    }
    
    drawOverlay(ctx: CanvasRenderingContext2D, zoom: number): void {
        if (this.previewTrim) {
            const { wall, originalEndPoint, newEndPoint } = this.previewTrim;
            
            ctx.save();
            ctx.strokeStyle = '#ff0000'; // Red for the part to be removed
            ctx.lineWidth = wall.thickness;
            ctx.globalAlpha = 0.6;
            ctx.setLineDash([4 / zoom, 4 / zoom]);
            
            ctx.beginPath();
            ctx.moveTo(originalEndPoint.x, originalEndPoint.y);
            ctx.lineTo(newEndPoint.x, newEndPoint.y);
            ctx.stroke();

            ctx.restore();
        }
    }

    deactivate(): void {
        this.reset();
        this.app.draw();
    }

    private reset(): void {
        this.boundaries = [];
        this.previewTrim = null;
    }

    // FIX: Implement abstract member 'getCursor'.
    getCursor(): string {
        return 'crosshair';
    }
}