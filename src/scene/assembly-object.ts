/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "../app";
import { Grip, GripType } from "../grips";
import { Point } from "./point";
import { BoundingBox, SceneObject } from "./scene-object";
import { objectFactory } from "./factory";

export interface Mate {
    id: number;
    type: 'rigid' | 'revolute' | 'slider';
    componentA: number; // ID of first component
    componentB: number; // ID of second component
    originA: Point;
    originB: Point;
    constraints: any; // Additional constraints like axis, limits
}

export class AssemblyObject implements SceneObject {
    id: number;
    components: SceneObject[];
    mates: Mate[];

    constructor(id: number, components: SceneObject[], mates: Mate[] = []) {
        this.id = id;
        this.components = components;
        this.mates = mates;
    }

    addComponent(obj: SceneObject) {
        if (!this.components.find(c => c.id === obj.id)) {
            this.components.push(obj);
        }
    }

    removeComponent(id: number) {
        const index = this.components.findIndex(c => c.id === id);
        if (index > -1) {
            this.components.splice(index, 1);
            // Remove related mates
            this.mates = this.mates.filter(m => m.componentA !== id && m.componentB !== id);
        }
    }

    addMate(mate: Mate) {
        this.mates.push(mate);
    }

    contains(point: Point, tolerance: number, app?: App): boolean {
        return this.components.some(obj => obj.contains(point, tolerance, app));
    }

    draw(ctx: CanvasRenderingContext2D, isSelected: boolean, zoom: number, allVisibleObjects: readonly SceneObject[], app: App): void {
        this.components.forEach(obj => obj.draw(ctx, false, zoom, allVisibleObjects, app));

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
        if (this.components.length === 0) {
            return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
        }
        const bboxes = this.components.map(obj => obj.getBoundingBox(app));
        return {
            minX: Math.min(...bboxes.map(b => b.minX)),
            minY: Math.min(...bboxes.map(b => b.minY)),
            maxX: Math.max(...bboxes.map(b => b.maxX)),
            maxY: Math.max(...bboxes.map(b => b.maxY)),
        };
    }

    move(dx: number, dy: number, app?: App): void {
        this.components.forEach(obj => obj.move(dx, dy, app));
    }

    rotate(angle: number, center: Point, app?: App): void {
        this.components.forEach(obj => obj.rotate(angle, center, app));
    }

    scale(factor: number, center: Point, app?: App): void {
        this.components.forEach(obj => obj.scale(factor, center, app));
    }

    clone(newId: number, app?: App): AssemblyObject {
        const newComponents = this.components.map(obj => obj.clone(app!.sceneService.getNextId(), app));
        const newMates = this.mates.map(m => ({ ...m, id: app!.sceneService.getNextId() }));
        return new AssemblyObject(newId, newComponents, newMates);
    }

    getCenter(app?: App): Point {
        const bbox = this.getBoundingBox(app);
        return {
            x: bbox.minX + (bbox.maxX - bbox.minX) / 2,
            y: bbox.minY + (bbox.maxY - bbox.minY) / 2,
        };
    }

    getSnapPoints(app?: App): Point[] {
        const bbox = this.getBoundingBox(app);
        return [
            this.getCenter(app),
            { x: bbox.minX, y: bbox.minY },
            { x: bbox.maxX, y: bbox.minY },
            { x: bbox.maxX, y: bbox.maxY },
            { x: bbox.minX, y: bbox.maxY },
        ];
    }

    getGrips(app?: App): Grip[] {
        if (this.components.length === 0) return [];
        const bbox = this.getBoundingBox(app);
        const center = this.getCenter(app);
        const grips: Grip[] = [
            { object: this, type: GripType.MOVE, point: center }
        ];

        const corners = [
            { x: bbox.minX, y: bbox.minY }, { x: bbox.maxX, y: bbox.minY },
            { x: bbox.maxX, y: bbox.maxY }, { x: bbox.minX, y: bbox.maxY }
        ];
        corners.forEach((p, i) => {
            grips.push({ object: this, type: GripType.STRETCH, point: p, metadata: { pointIndex: i, center } });
        });

        grips.push({
            object: this,
            type: GripType.ROTATE,
            point: { x: center.x, y: bbox.minY - 20 },
            metadata: { center }
        });

        return grips;
    }

    toJSON() {
        return {
            type: 'assembly',
            id: this.id,
            components: this.components.map(obj => obj.toJSON()),
            mates: this.mates,
        };
    }

    static fromJSON(data: any, app: App): AssemblyObject {
        const components = data.components.map((objData: any) => {
            const factory = objectFactory[objData.type as keyof typeof objectFactory];
            return factory ? factory(objData, app) : null;
        }).filter((obj: SceneObject | null): obj is SceneObject => obj !== null);

        return new AssemblyObject(data.id, components, data.mates || []);
    }
}
