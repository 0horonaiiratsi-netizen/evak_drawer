/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "../app";
import { Point } from "./point";
import { BoundingBox, SceneObject } from "./scene-object";
import { objectFactory } from "./factory";
import { Grip } from "../grips";

// This is very similar to GroupObject, but represents a distinct concept
export class SketchObject implements SceneObject {
    id: number;
    objects: SceneObject[];
    app: App; // Reference to app for ID generation in clone
    // FIX: Add isHidden property to conform to SceneObject.
    isHidden?: boolean;

    constructor(id: number, objects: SceneObject[], app: App) {
        this.id = id;
        this.objects = objects;
        this.app = app;
    }

    contains(point: Point, tolerance: number, app?: App): boolean {
        return this.objects.some(obj => obj.contains(point, tolerance, app));
    }

    draw(ctx: CanvasRenderingContext2D, isSelected: boolean, zoom: number, allVisibleObjects: readonly SceneObject[], app: App): void {
        const intersectionContext = this.objects;
        this.objects.forEach(obj => obj.draw(ctx, false, zoom, intersectionContext, app));

        if (isSelected) {
            const bbox = this.getBoundingBox(app);
            ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--selected-stroke-color');
            ctx.lineWidth = 1 / zoom;
            ctx.setLineDash([4 / zoom, 2 / zoom]);
            ctx.strokeRect(bbox.minX, bbox.minY, bbox.maxX - bbox.minX, bbox.maxY - bbox.minY);
            ctx.setLineDash([]);
        }
    }

    getBoundingBox(app?: App): BoundingBox {
        if (this.objects.length === 0) {
            return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
        }
        const bboxes = this.objects.map(obj => obj.getBoundingBox(app));
        return {
            minX: Math.min(...bboxes.map(b => b.minX)),
            minY: Math.min(...bboxes.map(b => b.minY)),
            maxX: Math.max(...bboxes.map(b => b.maxX)),
            maxY: Math.max(...bboxes.map(b => b.maxY)),
        };
    }

    move(dx: number, dy: number, app?: App): void {
        this.objects.forEach(obj => obj.move(dx, dy, app));
    }
    
    getCenter(app?: App): Point {
        const bbox = this.getBoundingBox(app);
        return {
            x: bbox.minX + (bbox.maxX - bbox.minX) / 2,
            y: bbox.minY + (bbox.maxY - bbox.minY) / 2,
        };
    }

    getGrips(app?: App): Grip[] {
        // For now, sketches are not editable after creation via grips.
        return [];
    }
    
    getSnapPoints(app?: App): Point[] {
        // Return snap points from child objects
        return this.objects.flatMap(obj => obj.getSnapPoints(app));
    }
    
    rotate(angle: number, center: Point, app?: App): void {
        this.objects.forEach(obj => obj.rotate(angle, center, app));
    }

    scale(factor: number, center: Point, app?: App): void {
        this.objects.forEach(obj => obj.scale(factor, center, app));
    }

    clone(newId: number, app?: App): SketchObject {
        const appInstance = app || this.app;
        // FIX: Use sceneService for getting next ID.
        const newObjects = this.objects.map(obj => obj.clone(appInstance.sceneService.getNextId(), appInstance));
        // FIX: Copy isHidden property on clone.
        const newSketch = new SketchObject(newId, newObjects, appInstance);
        newSketch.isHidden = this.isHidden;
        return newSketch;
    }
    
    toJSON() {
        return {
            type: 'sketch',
            id: this.id,
            objects: this.objects.map(obj => obj.toJSON()),
            // FIX: Add isHidden to serialization.
            isHidden: this.isHidden,
        };
    }

    static fromJSON(data: any, app: App): SketchObject {
        const objects = data.objects.map((objData: any) => {
            const factory = objectFactory[objData.type as keyof typeof objectFactory];
            return factory ? factory(objData, app) : null;
        }).filter((obj: SceneObject | null): obj is SceneObject => obj !== null);
        
        const sketch = new SketchObject(data.id, objects, app);
        // FIX: Add isHidden to deserialization.
        sketch.isHidden = data.isHidden;
        return sketch;
    }
}
