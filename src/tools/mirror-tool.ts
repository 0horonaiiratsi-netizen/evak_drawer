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
import { reflectPoint } from "../utils/intersections";
import { snapToGrid } from "../utils/geometry";
import { Tool, ToolType } from "./tool";

export class MirrorTool extends Tool {
    private step = 0;
    private firstPoint: Point | null = null;
    private originalObjects: SceneObject[] = [];
    private previewObjects: SceneObject[] = [];

    constructor(app: App) {
        super(app, ToolType.MIRROR);
    }

    activate(): void {
        super.activate();
        this.reset();
        if (this.app.selectionService.selectedIds.length === 0) {
            this.app.dialogController.alert("Дзеркало", "Спочатку виділіть об'єкти для віддзеркалення.");
            this.app.setActiveTool(ToolType.SELECT);
            return;
        }

        this.originalObjects = this.app.sceneService.objects.filter(obj => this.app.selectionService.selectedIds.includes(obj.id));
    }

    onMouseDown(point: Point, event: MouseEvent): void {
        const snappedPoint = this.app.isSnappingEnabled ? snapToGrid(point) : point;

        if (this.step === 0) {
            this.firstPoint = snappedPoint;
            this.step = 1;
        } else if (this.step === 1 && this.firstPoint) {
            const secondPoint = snappedPoint;

            const newObjects: SceneObject[] = [];
            this.originalObjects.forEach(obj => {
                const newId = this.app.sceneService.getNextId();
                const mirroredObj = obj.clone(newId, this.app);
                this.reflectObject(mirroredObj, this.firstPoint!, secondPoint);
                newObjects.push(mirroredObj);
            });

            newObjects.forEach(obj => this.app.addSceneObject(obj, false));
            this.app.projectStateService.commit("Mirror objects");
            this.app.selectionService.set(newObjects.map(o => o.id));

            this.resetAndSwitchToSelect();
        }
    }

    onMouseMove(point: Point, event: MouseEvent): void {
        if (this.step === 1 && this.firstPoint) {
            const currentPoint = this.app.isSnappingEnabled ? snapToGrid(point) : point;
            this.app.canvasController.setPreviewLine(this.firstPoint, currentPoint);

            this.previewObjects = this.originalObjects.map(obj => {
                const previewObj = obj.clone(obj.id, this.app);
                this.reflectObject(previewObj, this.firstPoint!, currentPoint);
                return previewObj;
            });
            this.app.draw();
        }
    }

    private reflectObject(obj: SceneObject, p1: Point, p2: Point): void {
        const reflect = (pt: Point) => reflectPoint(pt, p1, p2);
        const mirrorLineAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

        if (obj instanceof Wall) {
            obj.p1 = reflect(obj.p1);
            obj.p2 = reflect(obj.p2);
        } else if (obj instanceof PolylineObject) {
            obj.points = obj.points.map(reflect);
        } else if (obj instanceof CircleObject) {
            obj.center = reflect(obj.center);
        } else if (obj instanceof ArcObject) {
            const newCenter = reflect(obj.center);
            // Reflecting an arc reverses its direction and swaps start/end
            const newStartAngle = 2 * mirrorLineAngle - obj.endAngle;
            const newEndAngle = 2 * mirrorLineAngle - obj.startAngle;
            
            obj.center = newCenter;
            obj.startAngle = newStartAngle;
            obj.endAngle = newEndAngle;
            obj.counterClockwise = !obj.counterClockwise;
        } else if (obj instanceof GroupObject) {
            obj.objects.forEach(child => this.reflectObject(child, p1, p2));
        } else if (typeof (obj as any).angle === 'number' && typeof (obj as any).getCenter === 'function' && typeof (obj as any).move === 'function' && typeof (obj as any).rotate === 'function') {
            const center = obj.getCenter(this.app);
            const reflectedCenter = reflect(center);
            
            const originalAngle = (obj as any).angle;
            const newAngle = 2 * mirrorLineAngle - originalAngle;
            
            const dx = reflectedCenter.x - center.x;
            const dy = reflectedCenter.y - center.y;
            obj.move(dx, dy, this.app);
            
            const angleDelta = newAngle - originalAngle;
            obj.rotate(angleDelta, reflectedCenter, this.app);

            (obj as any).angle = newAngle;

        } else if (typeof (obj as any).getCenter === 'function' && typeof (obj as any).move === 'function') {
            const center = obj.getCenter(this.app);
            const reflectedCenter = reflect(center);
            const dx = reflectedCenter.x - center.x;
            const dy = reflectedCenter.y - center.y;
            obj.move(dx, dy, this.app);
        }
    }

    protected reset(): void {
        this.step = 0;
        this.firstPoint = null;
        this.originalObjects = [];
        this.previewObjects = [];
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