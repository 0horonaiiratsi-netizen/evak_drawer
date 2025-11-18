/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "../app";
import { Grip, GripType } from "../grips";
import { distance } from "../utils/geometry";
import { Point } from "./point";
import { BoundingBox, SceneObject } from "./scene-object";

export class PolylineObject implements SceneObject {
    id: number;
    points: Point[];
    isClosed: boolean;
    color: string;
    lineWidth: number;
    // FIX: Add isHidden property to conform to SceneObject.
    isHidden?: boolean;

    constructor(id: number, points: Point[], isClosed: boolean = false) {
        this.id = id;
        this.points = points;
        this.isClosed = isClosed;
        this.color = getComputedStyle(document.documentElement).getPropertyValue('--wall-color').trim();
        this.lineWidth = 1;
    }

    contains(point: Point, tolerance: number, app?: App): boolean {
        if (this.points.length < 2) return false;

        for (let i = 0; i < this.points.length - 1; i++) {
            if (this.isSegmentHit(point, this.points[i], this.points[i + 1], tolerance)) {
                return true;
            }
        }
        if (this.isClosed && this.points.length > 1) {
            if (this.isSegmentHit(point, this.points[this.points.length - 1], this.points[0], tolerance)) {
                return true;
            }
        }
        return false;
    }

    private isSegmentHit(point: Point, p1: Point, p2: Point, tolerance: number): boolean {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        if (dx === 0 && dy === 0) return distance(point, p1) <= tolerance;

        const t = ((point.x - p1.x) * dx + (point.y - p1.y) * dy) / (dx * dx + dy * dy);
        const clampedT = Math.max(0, Math.min(1, t));
        const closestPoint = { x: p1.x + clampedT * dx, y: p1.y + clampedT * dy };
        return distance(point, closestPoint) <= tolerance;
    }

    draw(ctx: CanvasRenderingContext2D, isSelected: boolean, zoom: number, allVisibleObjects: readonly SceneObject[], app: App): void {
        if (this.points.length < 2) return;

        ctx.save();
        const selectedColor = getComputedStyle(document.documentElement).getPropertyValue('--selected-stroke-color');
        ctx.strokeStyle = isSelected ? selectedColor : this.color;
        ctx.lineWidth = isSelected ? this.lineWidth + (2 / zoom) : this.lineWidth;

        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);
        for (let i = 1; i < this.points.length; i++) {
            ctx.lineTo(this.points[i].x, this.points[i].y);
        }
        if (this.isClosed) {
            ctx.closePath();
        }
        ctx.stroke();
        ctx.restore();
    }
    
    getLength(): number {
        let length = 0;
        for (let i = 0; i < this.points.length - 1; i++) {
            length += distance(this.points[i], this.points[i+1]);
        }
        if(this.isClosed && this.points.length > 1) {
            length += distance(this.points[this.points.length - 1], this.points[0]);
        }
        return length;
    }

    getBoundingBox(app?: App): BoundingBox {
        if (this.points.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
        return {
            minX: Math.min(...this.points.map(p => p.x)),
            minY: Math.min(...this.points.map(p => p.y)),
            maxX: Math.max(...this.points.map(p => p.x)),
            maxY: Math.max(...this.points.map(p => p.y)),
        };
    }

    move(dx: number, dy: number, app?: App): void {
        this.points.forEach(p => {
            p.x += dx;
            p.y += dy;
        });
    }
    
    getCenter(app?: App): Point {
        const bbox = this.getBoundingBox(app);
        return {
            x: bbox.minX + (bbox.maxX - bbox.minX) / 2,
            y: bbox.minY + (bbox.maxY - bbox.minY) / 2,
        };
    }

    getGrips(app?: App): Grip[] {
        const grips: Grip[] = [
            { object: this, type: GripType.MOVE, point: this.getCenter(app) }
        ];
        this.points.forEach((p, i) => {
            grips.push({ object: this, type: GripType.STRETCH, point: p, metadata: { pointIndex: i } });
        });
        const center = this.getCenter(app);
        grips.push({ object: this, type: GripType.ROTATE, point: { x: center.x, y: center.y - 20 }, metadata: { center: center, isReference: true } });
        grips.push({ object: this, type: GripType.SCALE, point: { x: center.x + 20, y: center.y }, metadata: { center: center, isReference: true } });
        return grips;
    }

    getSnapPoints(app?: App): Point[] {
        return [...this.points, this.getCenter(app)];
    }

    rotate(angle: number, center: Point, app?: App): void {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        this.points.forEach(p => {
            const translatedX = p.x - center.x;
            const translatedY = p.y - center.y;
            p.x = center.x + translatedX * cos - translatedY * sin;
            p.y = center.y + translatedX * sin + translatedY * cos;
        });
    }

    scale(factor: number, center: Point, app?: App): void {
        this.points.forEach(p => {
            const translatedX = p.x - center.x;
            const translatedY = p.y - center.y;
            p.x = center.x + translatedX * factor;
            p.y = center.y + translatedY * factor;
        });
    }

    clone(newId: number, app?: App): PolylineObject {
        const newPoints = this.points.map(p => ({ ...p }));
        const newPolyline = new PolylineObject(newId, newPoints, this.isClosed);
        newPolyline.color = this.color;
        newPolyline.lineWidth = this.lineWidth;
        // FIX: Copy isHidden property on clone.
        newPolyline.isHidden = this.isHidden;
        return newPolyline;
    }

    toJSON() {
        return {
            type: 'polyline',
            id: this.id,
            points: this.points,
            isClosed: this.isClosed,
            color: this.color,
            lineWidth: this.lineWidth,
            // FIX: Add isHidden to serialization.
            isHidden: this.isHidden,
        };
    }

    static fromJSON(data: any): PolylineObject {
        const polyline = new PolylineObject(data.id, data.points, data.isClosed);
        polyline.color = data.color ?? getComputedStyle(document.documentElement).getPropertyValue('--wall-color').trim();
        polyline.lineWidth = data.lineWidth ?? 1;
        // FIX: Add isHidden to deserialization.
        polyline.isHidden = data.isHidden;
        return polyline;
    }
}
