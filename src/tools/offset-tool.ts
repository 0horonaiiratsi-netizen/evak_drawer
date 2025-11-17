/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "../app";
import { Point } from "../scene/point";
import { CircleObject } from "../scene/circle-object";
import { PolylineObject } from "../scene/polyline-object";
import { SceneObject } from "../scene/scene-object";
import { Wall } from "../scene/wall";
import { Tool, ToolType } from "./tool";
import { ArcObject } from "../scene/arc-object";

export class OffsetTool extends Tool {
    private offsetDistance: number | null = null;
    private previewObject: SceneObject | null = null;

    constructor(app: App) {
        super(app, ToolType.OFFSET);
    }
    
    async activate(): Promise<void> {
        super.activate();
        this.reset();

        const distanceStr = await this.app.dialogController.prompt("Зміщення", "Введіть відстань зміщення:", "20");
        const distance = parseFloat(distanceStr || '');

        if (isNaN(distance) || distance === 0) {
            this.app.setActiveTool(ToolType.SELECT);
            return;
        }

        this.offsetDistance = distance;
    }

    onMouseDown(point: Point, event: MouseEvent): void {
        if (!this.previewObject) return;

        this.app.addSceneObject(this.previewObject);
        this.app.selectionService.setSingle(this.previewObject.id);
        this.app.projectStateService.commit("Offset object");
        this.previewObject = null; // Reset for next offset
    }

    onMouseMove(point: Point, event: MouseEvent): void {
        if (!this.offsetDistance) return;

        const tolerance = 5 / this.app.canvasController.zoom;
        const hoveredObject = [...this.app.sceneService.objects].reverse().find(obj => obj.contains(point, tolerance));
        
        if (hoveredObject) {
            this.previewObject = this.createOffsetObject(hoveredObject, point, this.offsetDistance);
        } else {
            this.previewObject = null;
        }
        this.app.draw();
    }

    private createOffsetObject(original: SceneObject, mousePoint: Point, distance: number): SceneObject | null {
        const newId = this.app.sceneService.getNextId();
        
        if (original instanceof Wall) {
            const angle = original.angle + Math.PI / 2;
            const dx = distance * Math.cos(angle);
            const dy = distance * Math.sin(angle);
            
            // Determine side based on mouse position
            const center = original.getCenter();
            const side = ((mousePoint.x - center.x) * dy - (mousePoint.y - center.y) * dx) > 0 ? 1 : -1;

            const newP1 = { x: original.p1.x + dx * side, y: original.p1.y + dy * side };
            const newP2 = { x: original.p2.x + dx * side, y: original.p2.y + dy * side };
            const newWall = new Wall(newId, newP1, newP2, original.type);
            newWall.color = original.color;
            return newWall;
        } else if (original instanceof CircleObject) {
            const distToCenter = Math.sqrt(Math.pow(mousePoint.x - original.center.x, 2) + Math.pow(mousePoint.y - original.center.y, 2));
            const newRadius = distToCenter > original.radius ? original.radius + distance : original.radius - distance;
            if (newRadius <= 0) return null;
            const newCircle = new CircleObject(newId, { ...original.center }, newRadius);
            newCircle.color = original.color;
            newCircle.lineWidth = original.lineWidth;
            return newCircle;
        } else if (original instanceof ArcObject) {
            const distToCenter = Math.sqrt(Math.pow(mousePoint.x - original.center.x, 2) + Math.pow(mousePoint.y - original.center.y, 2));
            const newRadius = distToCenter > original.radius ? original.radius + distance : original.radius - distance;
            if (newRadius <= 0) return null;
            const newArc = new ArcObject(newId, { ...original.center }, newRadius, original.startAngle, original.endAngle, original.counterClockwise);
            newArc.color = original.color;
            newArc.lineWidth = original.lineWidth;
            return newArc;
        } else if (original instanceof PolylineObject) {
            const geometryService = this.app.geometryService;
            let jstsGeom: jsts.geom.Geometry;
            let offsetDistance = distance;

            if (original.isClosed) {
                // Point-in-polygon test to determine offset direction (inside/outside)
                let isInside = false;
                for (let i = 0, j = original.points.length - 1; i < original.points.length; j = i++) {
                    const xi = original.points[i].x, yi = original.points[i].y;
                    const xj = original.points[j].x, yj = original.points[j].y;
                    const intersect = ((yi > mousePoint.y) !== (yj > mousePoint.y)) &&
                        (mousePoint.x < (xj - xi) * (mousePoint.y - yi) / (yj - yi) + xi);
                    if (intersect) isInside = !isInside;
                }
                if (isInside) {
                    offsetDistance = -distance;
                }
                jstsGeom = geometryService.createPolygonFromPolyline(original);
            } else {
                jstsGeom = geometryService.createLineStringFromPolyline(original);
                // For an open line, the buffer is symmetric. The result is a polygon surrounding the line.
            }
            
            const buffered = geometryService.createBuffer(jstsGeom, offsetDistance);
            if (buffered.isEmpty()) return null;

            const newPoly = geometryService.createPolylineFromJstsGeometry(newId, buffered);
            if (newPoly) {
                newPoly.color = original.color;
                newPoly.lineWidth = original.lineWidth;
                return newPoly;
            }
            return null;
        }
        
        return null;
    }

    protected reset(): void {
        this.offsetDistance = null;
        this.previewObject = null;
    }
    
    deactivate(): void {
        this.reset();
        this.app.draw();
    }

    drawOverlay(ctx: CanvasRenderingContext2D, zoom: number): void {
        if (this.previewObject) {
            ctx.globalAlpha = 0.7;
            this.previewObject.draw(ctx, false, zoom, this.app.sceneService.objects, this.app);
            ctx.globalAlpha = 1.0;
        }
    }

    getCursor(): string {
        return 'crosshair';
    }
}