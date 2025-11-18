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

export class ScaleTool extends Tool {
    private step = 0;
    private referencePoint: Point | null = null;
    private originalObjects: SceneObject[] = [];
    private previewObjects: SceneObject[] = [];
    private scaleFactor: number = 1;

    constructor(app: App) {
        super(app, ToolType.SCALE_BY_REFERENCE);
    }

    activate(): void {
        super.activate();
        this.reset();
        if (this.app.selectionService.selectedIds.length === 0) {
            this.app.dialogController.alert("Масштабування", "Спочатку виділіть об'єкти для масштабування.");
            this.app.setActiveTool(ToolType.SELECT);
            return;
        }

        this.originalObjects = this.app.sceneService.objects.filter(obj => this.app.selectionService.selectedIds.includes(obj.id));
        this.app.commandLineController.setPrompt("Виберіть референсну точку для масштабування:");
    }

    async onMouseDown(point: Point, event: MouseEvent): Promise<void> {
        const snappedPoint = this.app.isSnappingEnabled ? snapToGrid(point) : point;

        if (this.step === 0) {
            this.referencePoint = snappedPoint;
            this.step = 1;
            this.app.commandLineController.setPrompt("Введіть коефіцієнт масштабування:");
            const scaleStr = await this.app.dialogController.prompt("Масштабування", "Введіть коефіцієнт масштабування:", "1");
            const scale = parseFloat(scaleStr || '1');
            if (isNaN(scale) || scale <= 0) {
                this.resetAndSwitchToSelect();
                return;
            }
            this.scaleFactor = scale;

            const newObjects: SceneObject[] = [];
            this.originalObjects.forEach(obj => {
                const newId = this.app.sceneService.getNextId();
                const scaledObj = obj.clone(newId, this.app);
                this.scaleObject(scaledObj, this.referencePoint!, this.scaleFactor);
                newObjects.push(scaledObj);
            });

            newObjects.forEach(obj => this.app.addSceneObject(obj, false));
            this.app.projectStateService.commit("Scale objects");
            this.app.selectionService.set(newObjects.map(o => o.id));

            this.resetAndSwitchToSelect();
        }
    }

    onMouseMove(point: Point, event: MouseEvent): void {
        if (this.step === 1 && this.referencePoint) {
            const currentPoint = this.app.isSnappingEnabled ? snapToGrid(point) : point;
            const dx = currentPoint.x - this.referencePoint.x;
            const dy = currentPoint.y - this.referencePoint.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            this.scaleFactor = distance > 0 ? distance / 100 : 1; // Assume base distance of 100 for preview
            this.app.canvasController.setPreviewLine(this.referencePoint, currentPoint);

            this.previewObjects = this.originalObjects.map(obj => {
                const previewObj = obj.clone(obj.id, this.app);
                this.scaleObject(previewObj, this.referencePoint!, this.scaleFactor);
                return previewObj;
            });
            this.app.draw();
        }
    }

    private scaleObject(obj: SceneObject, pivot: Point, scale: number): void {
        const scalePoint = (pt: Point) => {
            const dx = pt.x - pivot.x;
            const dy = pt.y - pivot.y;
            return { x: pivot.x + dx * scale, y: pivot.y + dy * scale };
        };

        if (obj instanceof Wall) {
            obj.p1 = scalePoint(obj.p1);
            obj.p2 = scalePoint(obj.p2);
        } else if (obj instanceof PolylineObject) {
            obj.points = obj.points.map(scalePoint);
        } else if (obj instanceof CircleObject) {
            obj.center = scalePoint(obj.center);
            obj.radius *= scale;
        } else if (obj instanceof ArcObject) {
            obj.center = scalePoint(obj.center);
            obj.radius *= scale;
        } else if (obj instanceof GroupObject) {
            obj.objects.forEach(child => this.scaleObject(child, pivot, scale));
        } else if (typeof (obj as any).getCenter === 'function' && typeof (obj as any).move === 'function' && typeof (obj as any).scale === 'function') {
            const center = obj.getCenter(this.app);
            const scaledCenter = scalePoint(center);
            const dx = scaledCenter.x - center.x;
            const dy = scaledCenter.y - center.y;
            obj.move(dx, dy, this.app);
            obj.scale(scale, scaledCenter, this.app);
        } else if (typeof (obj as any).getCenter === 'function' && typeof (obj as any).move === 'function') {
            const center = obj.getCenter(this.app);
            const scaledCenter = scalePoint(center);
            const dx = scaledCenter.x - center.x;
            const dy = scaledCenter.y - center.y;
            obj.move(dx, dy, this.app);
        }
    }

    protected reset(): void {
        this.step = 0;
        this.referencePoint = null;
        this.originalObjects = [];
        this.previewObjects = [];
        this.scaleFactor = 1;
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
