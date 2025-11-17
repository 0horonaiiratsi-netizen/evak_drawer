/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "../app";
import { Grip, GripType } from "../grips";
import { Point } from "./point";
import { BoundingBox, SceneObject } from "./scene-object";
import { objectFactory } from "./factory";
import { Wall } from "./wall";

export class GroupObject implements SceneObject {
    id: number;
    objects: SceneObject[];

    constructor(id: number, objects: SceneObject[]) {
        this.id = id;
        this.objects = objects;
    }
    
    add(obj: SceneObject) {
        if (!this.objects.find(o => o.id === obj.id)) {
            this.objects.push(obj);
        }
    }
    
    remove(id: number) {
        const index = this.objects.findIndex(o => o.id === id);
        if (index > -1) {
            this.objects.splice(index, 1);
        }
    }

    contains(point: Point, tolerance: number, app?: App): boolean {
        // A group is "contained" if any of its children are.
        return this.objects.some(obj => obj.contains(point, tolerance, app));
    }

    draw(ctx: CanvasRenderingContext2D, isSelected: boolean, zoom: number, allVisibleObjects: readonly SceneObject[], app: App): void {
        const wallsInGroup = this.objects.filter(o => o instanceof Wall) as Wall[];
        const nonWallsInGroup = this.objects.filter(o => !(o instanceof Wall));

        // Use this.objects as the context for intersection calculations within the group.
        const intersectionContext = this.objects;

        // 1. Draw fills for walls in the group
        wallsInGroup.forEach(wall => wall.drawFill(ctx));

        // 2. Draw non-wall objects in the group (children are not individually selected)
        nonWallsInGroup.forEach(obj => obj.draw(ctx, false, zoom, intersectionContext, app));

        // 3. Draw strokes for walls in the group
        wallsInGroup.forEach(wall => wall.drawStroke(ctx, false, zoom, intersectionContext, app));


        if (isSelected) {
            const bbox = this.getBoundingBox(app);
            ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--selected-stroke-color');
            ctx.lineWidth = 1 / zoom;
            ctx.setLineDash([4 / zoom, 2 / zoom]);
            ctx.strokeRect(bbox.minX, bbox.minY, bbox.maxX - bbox.minX, bbox.maxY - bbox.minY);
            ctx.setLineDash([]);
        }
    }
    
    getAllChildren(): SceneObject[] {
        const children: SceneObject[] = [];
        for (const obj of this.objects) {
            children.push(obj);
            if (obj instanceof GroupObject) {
                children.push(...obj.getAllChildren());
            }
        }
        return children;
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
        if (this.objects.length === 0) return [];
        const bbox = this.getBoundingBox(app);
        const center = this.getCenter(app);
        const grips: Grip[] = [
            { object: this, type: GripType.MOVE, point: center }
        ];

        // Scale grips
        const corners = [
            { x: bbox.minX, y: bbox.minY }, { x: bbox.maxX, y: bbox.minY },
            { x: bbox.maxX, y: bbox.maxY }, { x: bbox.minX, y: bbox.maxY }
        ];
        corners.forEach((p, i) => {
            grips.push({ object: this, type: GripType.STRETCH, point: p, metadata: { pointIndex: i, center } });
        });
        
        // Rotate grip
        grips.push({
            object: this,
            type: GripType.ROTATE,
            point: { x: center.x, y: bbox.minY - 20 },
            metadata: { center }
        });

        return grips;
    }

    getSnapPoints(app?: App): Point[] {
        // For a group, we might just return the corners of its bounding box and its center.
        const bbox = this.getBoundingBox(app);
        return [
            this.getCenter(app),
            { x: bbox.minX, y: bbox.minY },
            { x: bbox.maxX, y: bbox.minY },
            { x: bbox.maxX, y: bbox.maxY },
            { x: bbox.minX, y: bbox.maxY },
        ];
    }
    
    rotate(angle: number, center: Point, app?: App): void {
        this.objects.forEach(obj => obj.rotate(angle, center, app));
    }

    scale(factor: number, center: Point, app?: App): void {
        this.objects.forEach(obj => obj.scale(factor, center, app));
    }

    clone(newId: number, app?: App): GroupObject {
        // This requires a deep clone of children, assigning new IDs to all of them.
        // This is complex and depends on how App manages IDs.
        // For now, let's assume a simplified clone for duplication.
        const newObjects = this.objects.map(obj => obj.clone(app!.sceneService.getNextId(), app)); // Hacky ID generation
        return new GroupObject(newId, newObjects);
    }
    
    toJSON() {
        return {
            type: 'group',
            id: this.id,
            objects: this.objects.map(obj => obj.toJSON()),
        };
    }

    static fromJSON(data: any, app: App): GroupObject {
        const objects = data.objects.map((objData: any) => {
            const factory = objectFactory[objData.type as keyof typeof objectFactory];
            return factory ? factory(objData, app) : null;
        }).filter((obj: SceneObject | null): obj is SceneObject => obj !== null);
        
        return new GroupObject(data.id, objects);
    }
}