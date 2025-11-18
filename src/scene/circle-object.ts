/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "../app";
import { Grip, GripType } from "../grips";
import { distance } from "../utils/geometry";
import { Point } from "./point";
import { BoundingBox, SceneObject } from "./scene-object";

export class CircleObject implements SceneObject {
    id: number;
    center: Point;
    radius: number;
    color: string;
    lineWidth: number;

    constructor(id: number, center: Point, radius: number) {
        this.id = id;
        this.center = center;
        this.radius = radius;
        this.color = getComputedStyle(document.documentElement).getPropertyValue('--wall-color').trim();
        this.lineWidth = 1;
    }

    contains(point: Point, tolerance: number, app?: App): boolean {
        // Check if the point is within tolerance of the circumference
        const dist = distance(point, this.center);
        return Math.abs(dist - this.radius) <= tolerance;
    }

    draw(ctx: CanvasRenderingContext2D, isSelected: boolean, zoom: number, allVisibleObjects: readonly SceneObject[], app: App): void {
        ctx.save();
        const selectedColor = getComputedStyle(document.documentElement).getPropertyValue('--selected-stroke-color');
        ctx.strokeStyle = isSelected ? selectedColor : this.color;
        ctx.lineWidth = isSelected ? this.lineWidth + (2 / zoom) : this.lineWidth;

        ctx.beginPath();
        ctx.arc(this.center.x, this.center.y, this.radius, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.restore();
    }

    getBoundingBox(app?: App): BoundingBox {
        return {
            minX: this.center.x - this.radius,
            minY: this.center.y - this.radius,
            maxX: this.center.x + this.radius,
            maxY: this.center.y + this.radius,
        };
    }

    move(dx: number, dy: number, app?: App): void {
        this.center.x += dx;
        this.center.y += dy;
    }

    rotate(angle: number, center: Point, app?: App): void {
        // Rotating a circle about any point only changes its center
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const translatedX = this.center.x - center.x;
        const translatedY = this.center.y - center.y;
        this.center.x = center.x + translatedX * cos - translatedY * sin;
        this.center.y = center.y + translatedX * sin + translatedY * cos;
    }

    scale(factor: number, center: Point, app?: App): void {
        const translatedX = this.center.x - center.x;
        const translatedY = this.center.y - center.y;
        this.center.x = center.x + translatedX * factor;
        this.center.y = center.y + translatedY * factor;
        this.radius *= factor;
    }

    clone(newId: number, app?: App): CircleObject {
        const newCircle = new CircleObject(newId, { ...this.center }, this.radius);
        newCircle.color = this.color;
        newCircle.lineWidth = this.lineWidth;
        return newCircle;
    }
    
    getCenter(app?: App): Point {
        return this.center;
    }

    getGrips(app?: App): Grip[] {
        const quadrantPoints = this.getSnapPoints(app).slice(1);
        const grips: Grip[] = [
            { object: this, type: GripType.MOVE, point: this.center },
        ];
        quadrantPoints.forEach((p, i) => {
            grips.push({ object: this, type: GripType.STRETCH, point: p, metadata: { pointIndex: i } });
        });
        grips.push({ object: this, type: GripType.ROTATE, point: { x: this.center.x, y: this.center.y - this.radius - 10 }, metadata: { center: this.center, isReference: true } });
        grips.push({ object: this, type: GripType.SCALE, point: { x: this.center.x + this.radius + 10, y: this.center.y }, metadata: { center: this.center, isReference: true } });
        return grips;
    }

    getSnapPoints(app?: App): Point[] {
        return [
            this.center,
            { x: this.center.x + this.radius, y: this.center.y }, // 0 degrees
            { x: this.center.x, y: this.center.y - this.radius }, // 90 degrees
            { x: this.center.x - this.radius, y: this.center.y }, // 180 degrees
            { x: this.center.x, y: this.center.y + this.radius }, // 270 degrees
        ];
    }

    toJSON() {
        return {
            type: 'circle',
            id: this.id,
            center: this.center,
            radius: this.radius,
            color: this.color,
            lineWidth: this.lineWidth,
        };
    }

    static fromJSON(data: any): CircleObject {
        const circle = new CircleObject(data.id, data.center, data.radius);
        circle.color = data.color ?? getComputedStyle(document.documentElement).getPropertyValue('--wall-color').trim();
        circle.lineWidth = data.lineWidth ?? 1;
        return circle;
    }
}
