/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { App } from "../app";
import { Grip, GripType } from "../grips";
import { distance } from "../utils/geometry";
import { Point } from "./point";
import { BoundingBox, SceneObject } from "./scene-object";

export class LineObject implements SceneObject {
    id: number;
    start: Point;
    end: Point;
    color: string;
    lineWidth: number;
    layer?: any; // Reference to Layer, to be added

    constructor(id: number, start: Point, end: Point) {
        this.id = id;
        this.start = start;
        this.end = end;
        this.color = getComputedStyle(document.documentElement).getPropertyValue('--wall-color').trim();
        this.lineWidth = 1;
    }

    contains(point: Point, tolerance: number, app?: App): boolean {
        const dx = this.end.x - this.start.x;
        const dy = this.end.y - this.start.y;
        if (dx === 0 && dy === 0) return distance(point, this.start) <= tolerance;

        const t = ((point.x - this.start.x) * dx + (point.y - this.start.y) * dy) / (dx * dx + dy * dy);
        const clampedT = Math.max(0, Math.min(1, t));
        const closestPoint = { x: this.start.x + clampedT * dx, y: this.start.y + clampedT * dy };
        return distance(point, closestPoint) <= tolerance;
    }

    draw(ctx: CanvasRenderingContext2D, isSelected: boolean, zoom: number, allVisibleObjects: readonly SceneObject[], app: App): void {
        ctx.save();
        const selectedColor = getComputedStyle(document.documentElement).getPropertyValue('--selected-stroke-color');
        ctx.strokeStyle = isSelected ? selectedColor : this.color;
        ctx.lineWidth = isSelected ? this.lineWidth + (2 / zoom) : this.lineWidth;

        ctx.beginPath();
        ctx.moveTo(this.start.x, this.start.y);
        ctx.lineTo(this.end.x, this.end.y);
        ctx.stroke();
        ctx.restore();
    }

    getLength(): number {
        return distance(this.start, this.end);
    }

    getBoundingBox(app?: App): BoundingBox {
        return {
            minX: Math.min(this.start.x, this.end.x),
            minY: Math.min(this.start.y, this.end.y),
            maxX: Math.max(this.start.x, this.end.x),
            maxY: Math.max(this.start.y, this.end.y),
        };
    }

    move(dx: number, dy: number, app?: App): void {
        this.start.x += dx;
        this.start.y += dy;
        this.end.x += dx;
        this.end.y += dy;
    }

    getCenter(app?: App): Point {
        return {
            x: (this.start.x + this.end.x) / 2,
            y: (this.start.y + this.end.y) / 2,
        };
    }

    getGrips(app?: App): Grip[] {
        const grips: Grip[] = [
            { object: this, type: GripType.MOVE, point: this.getCenter(app) }
        ];
        grips.push({ object: this, type: GripType.STRETCH, point: this.start, metadata: { pointIndex: 0 } });
        grips.push({ object: this, type: GripType.STRETCH, point: this.end, metadata: { pointIndex: 1 } });
        grips.push({ object: this, type: GripType.ROTATE, point: { x: this.getCenter(app).x, y: this.getCenter(app).y - 20 }, metadata: { center: this.getCenter(app), isReference: true } });
        grips.push({ object: this, type: GripType.SCALE, point: { x: this.getCenter(app).x + 20, y: this.getCenter(app).y }, metadata: { center: this.getCenter(app), isReference: true } });
        grips.push({ object: this, type: GripType.ROTATE_BY_REF, point: { x: this.getCenter(app).x, y: this.getCenter(app).y - 30 }, metadata: { center: this.getCenter(app), isReference: true } });
        grips.push({ object: this, type: GripType.SCALE_BY_REF, point: { x: this.getCenter(app).x + 30, y: this.getCenter(app).y }, metadata: { center: this.getCenter(app), isReference: true } });
        return grips;
    }

    getSnapPoints(app?: App): Point[] {
        return [this.start, this.end, this.getCenter(app)];
    }

    rotate(angle: number, center: Point, app?: App): void {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        [this.start, this.end].forEach(p => {
            const translatedX = p.x - center.x;
            const translatedY = p.y - center.y;
            p.x = center.x + translatedX * cos - translatedY * sin;
            p.y = center.y + translatedX * sin + translatedY * cos;
        });
    }

    scale(factor: number, center: Point, app?: App): void {
        [this.start, this.end].forEach(p => {
            const translatedX = p.x - center.x;
            const translatedY = p.y - center.y;
            p.x = center.x + translatedX * factor;
            p.y = center.y + translatedY * factor;
        });
    }

    clone(newId: number, app?: App): LineObject {
        const newLine = new LineObject(newId, { ...this.start }, { ...this.end });
        newLine.color = this.color;
        newLine.lineWidth = this.lineWidth;
        newLine.layer = this.layer;
        return newLine;
    }

    toJSON() {
        return {
            type: 'line',
            id: this.id,
            start: this.start,
            end: this.end,
            color: this.color,
            lineWidth: this.lineWidth,
            layer: this.layer,
        };
    }

    static fromJSON(data: any): LineObject {
        const line = new LineObject(data.id, data.start, data.end);
        line.color = data.color ?? getComputedStyle(document.documentElement).getPropertyValue('--wall-color').trim();
        line.lineWidth = data.lineWidth ?? 1;
        line.layer = data.layer;
        return line;
    }
}
