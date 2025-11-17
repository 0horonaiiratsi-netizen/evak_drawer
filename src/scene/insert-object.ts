/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { App } from "../app";
import { Grip, GripType } from "../grips";
import { Point } from "./point";
import { BoundingBox, SceneObject } from "./scene-object";

export class InsertObject implements SceneObject {
    id: number;
    blockName: string;
    position: Point;
    insertScale: Point;
    rotation: number;
    color: string;
    lineWidth: number;
    layer?: any; // Reference to Layer, to be added

    constructor(id: number, blockName: string, position: Point) {
        this.id = id;
        this.blockName = blockName;
        this.position = position;
        this.insertScale = new Point(1, 1);
        this.rotation = 0;
        this.color = getComputedStyle(document.documentElement).getPropertyValue('--wall-color').trim();
        this.lineWidth = 1;
    }

    contains(point: Point, tolerance: number, app?: App): boolean {
        // Simple point check for now
        return Math.abs(point.x - this.position.x) <= tolerance && Math.abs(point.y - this.position.y) <= tolerance;
    }

    draw(ctx: CanvasRenderingContext2D, isSelected: boolean, zoom: number, allVisibleObjects: readonly SceneObject[], app: App): void {
        // For now, just draw a marker at the insertion point
        ctx.save();
        const selectedColor = getComputedStyle(document.documentElement).getPropertyValue('--selected-stroke-color');
        ctx.strokeStyle = isSelected ? selectedColor : this.color;
        ctx.lineWidth = isSelected ? this.lineWidth + (2 / zoom) : this.lineWidth;

        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, 5 / zoom, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.restore();
    }

    getBoundingBox(app?: App): BoundingBox {
        return {
            minX: this.position.x - 5,
            minY: this.position.y - 5,
            maxX: this.position.x + 5,
            maxY: this.position.y + 5,
        };
    }

    move(dx: number, dy: number, app?: App): void {
        this.position.x += dx;
        this.position.y += dy;
    }

    getCenter(app?: App): Point {
        return this.position;
    }

    getGrips(app?: App): Grip[] {
        return [
            { object: this, type: GripType.MOVE, point: this.getCenter(app) }
        ];
    }

    getSnapPoints(app?: App): Point[] {
        return [this.position];
    }

    rotate(angle: number, center: Point, app?: App): void {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const translatedX = this.position.x - center.x;
        const translatedY = this.position.y - center.y;
        this.position.x = center.x + translatedX * cos - translatedY * sin;
        this.position.y = center.y + translatedX * sin + translatedY * cos;
        this.rotation += angle;
    }

    scale(factor: number, center: Point, app?: App): void {
        const translatedX = this.position.x - center.x;
        const translatedY = this.position.y - center.y;
        this.position.x = center.x + translatedX * factor;
        this.position.y = center.y + translatedY * factor;
        this.scale.x *= factor;
        this.scale.y *= factor;
    }

    clone(newId: number, app?: App): InsertObject {
        const newInsert = new InsertObject(newId, this.blockName, { ...this.position });
        newInsert.scale = { ...this.scale };
        newInsert.rotation = this.rotation;
        newInsert.color = this.color;
        newInsert.lineWidth = this.lineWidth;
        newInsert.layer = this.layer;
        return newInsert;
    }

    toJSON() {
        return {
            type: 'insert',
            id: this.id,
            blockName: this.blockName,
            position: this.position,
            scale: this.scale,
            rotation: this.rotation,
            color: this.color,
            lineWidth: this.lineWidth,
            layer: this.layer,
        };
    }

    static fromJSON(data: any): InsertObject {
        const insert = new InsertObject(data.id, data.blockName, data.position);
        insert.scale = data.scale ?? new Point(1, 1);
        insert.rotation = data.rotation ?? 0;
        insert.color = data.color ?? getComputedStyle(document.documentElement).getPropertyValue('--wall-color').trim();
        insert.lineWidth = data.lineWidth ?? 1;
        insert.layer = data.layer;
        return insert;
    }
}
