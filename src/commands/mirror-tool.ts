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
import { Command } from "./command";

// FIX: This class name conflicts with the actual tool. Renaming to avoid confusion.
class PatchedMirrorTool extends Tool {
    private step = 0;
    private firstPoint: Point | null = null;
    private originalObjects: SceneObject[] = [];
    private previewObjects: SceneObject[] = [];

    constructor(app: App, private onFinish: () => void) {
        super(app, ToolType.MIRROR);
    }

    activate(): void {
        super.activate();
        this.reset();
        if (this.app.selectionService.selectedIds.length === 0) {
            this.app.dialogController.alert("Дзеркало", "Спочатку виділіть об'єкти для віддзеркалення.");
            this.onFinish();
            return;
        }

        // FIX: Use sceneService to access objects.
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
                // FIX: Use sceneService for getting next ID.
                const newId = this.app.sceneService.getNextId();
                const mirroredObj = obj.clone(newId);
                this.reflectObject(mirroredObj, this.firstPoint!, secondPoint);
                newObjects.push(mirroredObj);
            });

            newObjects.forEach(obj => this.app.addSceneObject(obj, false));
            // FIX: Use projectStateService for history.
            this.app.projectStateService.commit("Mirror objects");
            this.app.setSelectedObjectIds(newObjects.map(o => o.id));

            this.resetAndSwitchToSelect();
        }
    }

    onMouseMove(point: Point, event: MouseEvent): void {
        if (this.step === 1 && this.firstPoint) {
            const currentPoint = this.app.isSnappingEnabled ? snapToGrid(point) : point;
            this.app.canvasController.setPreviewLine(this.firstPoint, currentPoint);

            this.previewObjects = this.originalObjects.map(obj => {
                const previewObj = obj.clone(obj.id);
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
            // Generic handler for objects with center and angle (Symbol, Text, Door, Window, Stairs, Hatch, PDF)
            const center = obj.getCenter();
            const reflectedCenter = reflect(center);
            
            const originalAngle = (obj as any).angle;
            const newAngle = 2 * mirrorLineAngle - originalAngle;
            
            // First, move the object to its new reflected center
            const dx = reflectedCenter.x - center.x;
            const dy = reflectedCenter.y - center.y;
            obj.move(dx, dy);
            
            // Then, rotate it to its new angle around its new center
            const angleDelta = newAngle - originalAngle;
            obj.rotate(angleDelta, reflectedCenter);

            // Ensure the final angle is set precisely, as some rotate methods might only increment.
            (obj as any).angle = newAngle;

        } else if (typeof (obj as any).getCenter === 'function' && typeof (obj as any).move === 'function') {
             // Fallback for objects that only have a center but no angle
            const center = obj.getCenter();
            const reflectedCenter = reflect(center);
            const dx = reflectedCenter.x - center.x;
            const dy = reflectedCenter.y - center.y;
            obj.move(dx, dy);
        }
    }

    // FIX: Changed from private to protected to allow subclass access.
    protected reset(): void {
        this.step = 0;
        this.firstPoint = null;
        this.originalObjects = [];
        this.previewObjects = [];
        this.app.canvasController.setPreviewLine(null);
    }

    // FIX: Changed from private to protected to allow subclass overriding.
    protected resetAndSwitchToSelect(): void {
        this.reset();
        this.onFinish();
    }

    deactivate(): void {
        this.reset();
        this.app.draw();
    }

    drawOverlay(ctx: CanvasRenderingContext2D, zoom: number): void {
        // FIX: Use sceneService to access objects.
        const allSceneObjects = this.app.sceneService.objects;
        this.previewObjects.forEach(obj => {
            ctx.globalAlpha = 0.5;
            // FIX: Expected 5 arguments, but got 4. Add the 'app' instance.
            obj.draw(ctx, false, zoom, allSceneObjects, this.app);
            ctx.globalAlpha = 1.0;
        });
    }

    // FIX: Implement abstract member 'getCursor'.
    getCursor(): string {
        return 'crosshair';
    }
}


/**
 * A wrapper class to make the legacy MirrorTool compatible with the new CommandManager,
 * allowing it to be triggered from the command line.
 */
// FIX: Changed class to implement 'Command' directly and added required properties 'app' and 'type'.
export class MirrorCommand implements Command {
    app: App;
    type: ToolType = ToolType.MIRROR;
    private wrappedTool: PatchedMirrorTool;

    constructor(app: App) {
        this.app = app;
        this.wrappedTool = new PatchedMirrorTool(app, () => {
            // When the tool finishes, it tells the command manager to finish as well.
            this.app.commandManager.finishCommand();
        });
    }

    start(preSelectedObjects?: SceneObject[]): void {
        if (preSelectedObjects && preSelectedObjects.length > 0) {
            this.app.selectionService.set(preSelectedObjects.map(o => o.id));
        }
        // The command itself becomes the active "tool" for the input handler
        this.app.activeTool = this;
        this.wrappedTool.activate();
    }
    
    finish(): void {
        this.wrappedTool.deactivate();
    }

    cancel(): void {
        this.wrappedTool.deactivate();
    }

    // Delegate all Tool methods to the wrapped tool instance
    onMouseDown(point: Point, event: MouseEvent): void { this.wrappedTool.onMouseDown(point, event); }
    onMouseMove(point: Point, event: MouseEvent): void { this.wrappedTool.onMouseMove(point, event); }
    onMouseUp(point: Point, event: MouseEvent): void { (this.wrappedTool as any).onMouseUp(point, event); }
    onKeyDown(event: KeyboardEvent): void { this.wrappedTool.onKeyDown(event); }
    onKeyUp(event: KeyboardEvent): void { (this.wrappedTool as any).onKeyUp(event); }
    onContextMenu(worldPoint: Point, screenPoint: Point): void { this.wrappedTool.onContextMenu(worldPoint, screenPoint); }
    drawOverlay(ctx: CanvasRenderingContext2D, zoom: number): void { this.wrappedTool.drawOverlay(ctx, zoom); }
    getCursor(): string { return this.wrappedTool.getCursor(); }
    
    // Satisfy the Tool abstract methods, even though they just delegate
    activate(): void { this.wrappedTool.activate(); }
    deactivate(): void { this.wrappedTool.deactivate(); }
}
