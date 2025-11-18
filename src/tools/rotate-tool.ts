/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "../app";
import { Point } from "../scene/point";
import { SceneObject } from "../scene/scene-object";
import { ArcObject } from "../scene/arc-object";
import { CircleObject } from "../scene/circle-object";
import { GroupObject } from "../scene/group-object";
import { PolylineObject } from "../scene/polyline-object";
import { Wall } from "../scene/wall";
import { snapToGrid } from "../utils/geometry";
import { Tool, ToolType } from "./tool";

export class RotateTool extends Tool {
    private step = 0;
    private referencePoint: Point | null = null;
    private originalObjects: SceneObject[] = [];
    private previewObjects: SceneObject[] = [];
    private angle: number = 0;

    constructor(app: App) {
        super(app, ToolType.ROTATE_BY_REFERENCE);
    }

    activate(): void {
        super.activate();
        this.reset();
        if (this.app.selectionService.selectedIds.length === 0) {
            this.app.dialogController.alert("Обертання", "Спочатку виділіть об'єкти для обертання.");
            this.app.setActiveTool(ToolType.SELECT);
            return;
        }

        this.originalObjects = this.app.sceneService.objects.filter(obj => this.app.selectionService.selectedIds.includes(obj.id));
        this.app.commandLineController.setPrompt("Виберіть референсну точку для обертання:");
    }

    async onMouseDown(point: Point, event: MouseEvent): Promise<void> {
        const snappedPoint = this.app.isSnappingEnabled ? snapToGrid(point) : point;

        if (this.step === 0) {
            this.referencePoint = snappedPoint;
            this.step = 1;
            this.app.commandLineController.setPrompt("Введіть кут обертання (градуси):");
            const angleStr = await this.app.dialogController.prompt("Обертання", "Введіть кут обертання в градусах:", "0");
            const angleDeg = parseFloat(angleStr || '0');
            if (isNaN(angleDeg)) {
                this.resetAndSwitchToSelect();
                return;
            }
            this.angle = (angleDeg * Math.PI) / 180; // Convert to radians

            const newObjects: SceneObject[] = [];
            this.originalObjects.forEach(obj => {
                const newId = this.app.sceneService.getNextId();
                const rotatedObj = obj.clone(newId, this.app);
                this.rotateObject(rotatedObj, this.referencePoint!, this.angle);
                newObjects.push(rotatedObj);
            });

            newObjects.forEach(obj => this.app.addSceneObject(obj, false));
            this.app.projectStateService.commit("Rotate objects");
            this.app.selectionService.set(newObjects.map(o => o.id));

            this.resetAndSwitchToSelect();
        }
    }

    onMouseMove(point: Point, event: MouseEvent): void {
        if (this.step === 1 && this.referencePoint) {
            const currentPoint = this.app.isSnappingEnabled ? snapToGrid(point) : point;
            this.angle = Math.atan2(currentPoint.y - this.referencePoint.y, currentPoint.x - this.referencePoint.x);
            this.app.canvasController.setPreviewLine(this.referencePoint, currentPoint);

            this.previewObjects = this.originalObjects.map(obj => {
                const previewObj = obj.clone(obj.id, this.app);
                this.rotateObject(previewObj, this.referencePoint!, this.angle);
                return previewObj;
            });
            this.app.draw();
        }
    }



    private rotateObject(obj: SceneObject, pivot: Point, angle: number): void {
        const rotatePoint = (pt: Point) => {
            const dx = pt.x - pivot.x;
            const dy = pt.y - pivot.y;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            return { x: pivot.x + dx * cos - dy * sin, y: pivot.y + dx * sin + dy * cos };
        };

        if (obj instanceof Wall) {
            obj.p1 = rotatePoint(obj.p1);
            obj.p2 = rotatePoint(obj.p2);
        } else if (obj instanceof PolylineObject) {
            obj.points = obj.points.map(rotatePoint);
        } else if (obj instanceof CircleObject) {
            obj.center = rotatePoint(obj.center);
        } else if (obj instanceof ArcObject) {
            obj.center = rotatePoint(obj.center);
            obj.startAngle += angle;
            obj.endAngle += angle;
        } else if (obj instanceof GroupObject) {
            obj.objects.forEach(child => this.rotateObject(child, pivot, angle));
        } else if (typeof (obj as any).angle === 'number' && typeof (obj as any).getCenter === 'function' && typeof (obj as any).move === 'function' && typeof (obj as any).rotate === 'function') {
            const center = obj.getCenter(this.app);
            const rotatedCenter = rotatePoint(center);
            const dx = rotatedCenter.x - center.x;
            const dy = rotatedCenter.y - center.y;
            obj.move(dx, dy, this.app);
            obj.rotate(angle, rotatedCenter, this.app);
            (obj as any).angle += angle;
        } else if (typeof (obj as any).getCenter === 'function' && typeof (obj as any).move === 'function') {
            const center = obj.getCenter(this.app);
            const rotatedCenter = rotatePoint(center);
            const dx = rotatedCenter.x - center.x;
            const dy = rotatedCenter.y - center.y;
            obj.move(dx, dy, this.app);
        }
    }

    protected reset(): void {
        this.step = 0;
        this.referencePoint = null;
        this.originalObjects = [];
        this.previewObjects = [];
        this.angle = 0;
        this.app.canvasController.setPreviewLine(null);
    }

    protected resetAndSwitchToSelect(): void {
        this.reset();
        this.app.setActiveTool(ToolType.SELECT);
    }

    deactivate(): void {
        this.reset();
        this.app.draw();
    }

    drawOverlay(ctx: CanvasRenderingContext2D, zoom: number): void {
        const allSceneObjects = this.app.sceneService.objects;
        this.previewObjects.forEach(obj => {
            ctx.globalAlpha = 0.5;
            obj.draw(ctx, false, zoom, allSceneObjects, this.app);
            ctx.globalAlpha = 1.0;
        });
    }

    getCursor(): string {
        return 'crosshair';
    }
}
