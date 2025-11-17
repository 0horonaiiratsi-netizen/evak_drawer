/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { App } from "../app";
import { Grip, GripType } from "../grips";
import { distance } from "../utils/geometry";
import { Point } from "./point";
import { BoundingBox, SceneObject } from "./scene-object";

export class SplineObject implements SceneObject {
    id: number;
    controlPoints: Point[];
    degree: number;
    knots: number[];
    color: string;
    lineWidth: number;
    layer?: any; // Reference to Layer, to be added

    constructor(id: number, controlPoints: Point[], degree: number, knots: number[]) {
        this.id = id;
        this.controlPoints = controlPoints;
        this.degree = degree;
        this.knots = knots;
        this.color = getComputedStyle(document.documentElement).getPropertyValue('--wall-color').trim();
        this.lineWidth = 1;
    }

    contains(point: Point, tolerance: number, app?: App): boolean {
        // Simple bounding box check for now
        const bbox = this.getBoundingBox(app);
        return point.x >= bbox.minX - tolerance && point.x <= bbox.maxX + tolerance &&
               point.y >= bbox.minY - tolerance && point.y <= bbox.maxY + tolerance;
    }

    draw(ctx: CanvasRenderingContext2D, isSelected: boolean, zoom: number, allVisibleObjects: readonly SceneObject[], app: App): void {
        if (this.controlPoints.length < 2) return;

        ctx.save();
        const selectedColor = getComputedStyle(document.documentElement).getPropertyValue('--selected-stroke-color');
        ctx.strokeStyle = isSelected ? selectedColor : this.color;
        ctx.lineWidth = isSelected ? this.lineWidth + (2 / zoom) : this.lineWidth;

        ctx.beginPath();
        ctx.moveTo(this.controlPoints[0].x, this.controlPoints[0].y);
        for (let i = 1; i < this.controlPoints.length; i++) {
            ctx.lineTo(this.controlPoints[i].x, this.controlPoints[i].y);
        }
        ctx.stroke();
        ctx.restore();
    }

    getBoundingBox(app?: App): BoundingBox {
        if (this.controlPoints.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
        return {
            minX: Math.min(...this.controlPoints.map(p => p.x)),
            minY: Math.min(...this.controlPoints.map(p => p.y)),
            maxX: Math.max(...this.controlPoints.map(p => p.x)),
            maxY: Math.max(...this.controlPoints.map(p => p.y)),
        };
    }

    move(dx: number, dy: number, app?: App): void {
        this.controlPoints.forEach(p => {
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
        this.controlPoints.forEach((p, i) => {
            grips.push({ object: this, type: GripType.STRETCH, point: p, metadata: { pointIndex: i } });
        });
        return grips;
    }

    getSnapPoints(app?: App): Point[] {
        return [...this.controlPoints, this.getCenter(app)];
    }

    rotate(angle: number, center: Point, app?: App): void {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        this.controlPoints.forEach(p => {
            const translatedX = p.x - center.x;
            const translatedY = p.y - center.y;
            p.x = center.x + translatedX * cos - translatedY * sin;
            p.y = center.y + translatedX * sin + translatedY * cos;
        });
    }

    scale(factor: number, center: Point, app?: App): void {
        this.controlPoints.forEach(p => {
            const translatedX = p.x - center.x;
            const translatedY = p.y - center.y;
            p.x = center.x + translatedX * factor;
            p.y = center.y + translatedY * factor;
        });
    }

    clone(newId: number, app?: App): SplineObject {
        const newPoints = this.controlPoints.map(p => ({ ...p }));
        const newSpline = new SplineObject(newId, newPoints, this.degree, [...this.knots]);
        newSpline.color = this.color;
        newSpline.lineWidth = this.lineWidth;
        newSpline.layer = this.layer;
        return newSpline;
    }

    toJSON() {
        return {
            type: 'spline',
            id: this.id,
            controlPoints: this.controlPoints,
            degree: this.degree,
            knots: this.knots,
            color: this.color,
            lineWidth: this.lineWidth,
            layer: this.layer,
        };
    }

    static fromJSON(data: any): SplineObject {
        const spline = new SplineObject(data.id, data.controlPoints, data.degree, data.knots);
        spline.color = data.color ?? getComputedStyle(document.documentElement).getPropertyValue('--wall-color').trim();
        spline.lineWidth = data.lineWidth ?? 1;
        spline.layer = data.layer;
        return spline;
    }
}
