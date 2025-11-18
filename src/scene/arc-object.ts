/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "../app";
import { Grip, GripType } from "../grips";
import { distance } from "../utils/geometry";
import { Point } from "./point";
import { BoundingBox, SceneObject } from "./scene-object";

export class ArcObject implements SceneObject {
    id: number;
    center: Point;
    radius: number;
    startAngle: number;
    endAngle: number;
    counterClockwise: boolean;
    color: string;
    lineWidth: number;

    constructor(id: number, center: Point, radius: number, startAngle: number, endAngle: number, counterClockwise: boolean = false) {
        this.id = id;
        this.center = center;
        this.radius = radius;
        this.startAngle = startAngle;
        this.endAngle = endAngle;
        this.counterClockwise = counterClockwise;
        this.color = getComputedStyle(document.documentElement).getPropertyValue('--wall-color').trim();
        this.lineWidth = 1;
    }

    contains(point: Point, tolerance: number, app?: App): boolean {
        const distFromCenter = distance(point, this.center);
        if (Math.abs(distFromCenter - this.radius) > tolerance) {
            return false;
        }

        let angle = Math.atan2(point.y - this.center.y, point.x - this.center.x);
        return this.isAngleOnArc(angle);
    }

    /**
     * Checks if a given angle is within the arc's angular range.
     * @param angle The angle to check, in radians.
     * @returns True if the angle is on the arc.
     */
    isAngleOnArc(angle: number): boolean {
        // Normalize all angles to be within [0, 2*PI]
        const twoPi = 2 * Math.PI;
        let start = (this.startAngle % twoPi + twoPi) % twoPi;
        let end = (this.endAngle % twoPi + twoPi) % twoPi;
        let checkAngle = (angle % twoPi + twoPi) % twoPi;

        if (this.counterClockwise) {
            [start, end] = [end, start];
        }

        if (start < end) {
            // Add a small epsilon for floating point issues at the boundaries
            return checkAngle >= start - 1e-9 && checkAngle <= end + 1e-9;
        } else { // Arc crosses the 0-radian line
            return checkAngle >= start - 1e-9 || checkAngle <= end + 1e-9;
        }
    }


    draw(ctx: CanvasRenderingContext2D, isSelected: boolean, zoom: number, allVisibleObjects: readonly SceneObject[], app: App): void {
        ctx.save();
        const selectedColor = getComputedStyle(document.documentElement).getPropertyValue('--selected-stroke-color');
        ctx.strokeStyle = isSelected ? selectedColor : this.color;
        ctx.lineWidth = isSelected ? this.lineWidth + (2 / zoom) : this.lineWidth;
        
        ctx.beginPath();
        ctx.arc(this.center.x, this.center.y, this.radius, this.startAngle, this.endAngle, this.counterClockwise);
        ctx.stroke();
        ctx.restore();
    }

    getBoundingBox(app?: App): BoundingBox {
        const points = this.getSnapPoints(app);
        return {
            minX: Math.min(...points.map(p => p.x)),
            minY: Math.min(...points.map(p => p.y)),
            maxX: Math.max(...points.map(p => p.x)),
            maxY: Math.max(...points.map(p => p.y)),
        };
    }

    move(dx: number, dy: number, app?: App): void {
        this.center.x += dx;
        this.center.y += dy;
    }
    
    getCenter(app?: App): Point {
        // This is not the geometric center of the arc segment, but the center of the circle it belongs to.
        return this.center;
    }
    
    getStartPoint(): Point {
        return {
            x: this.center.x + this.radius * Math.cos(this.startAngle),
            y: this.center.y + this.radius * Math.sin(this.startAngle),
        };
    }
    
    getEndPoint(): Point {
         return {
            x: this.center.x + this.radius * Math.cos(this.endAngle),
            y: this.center.y + this.radius * Math.sin(this.endAngle),
        };
    }

    getMidPoint(): Point {
        const totalAngle = this.endAngle - this.startAngle;
        const midAngle = this.startAngle + totalAngle / 2;
        return {
            x: this.center.x + this.radius * Math.cos(midAngle),
            y: this.center.y + this.radius * Math.sin(midAngle),
        };
    }

    getGrips(app?: App): Grip[] {
        return [
            { object: this, type: GripType.MOVE, point: this.getCenter(app) },
            { object: this, type: GripType.STRETCH, point: this.getStartPoint(), metadata: { pointIndex: 0 } },
            { object: this, type: GripType.STRETCH, point: this.getMidPoint(), metadata: { pointIndex: 1 } },
            { object: this, type: GripType.STRETCH, point: this.getEndPoint(), metadata: { pointIndex: 2 } },
            { object: this, type: GripType.ROTATE, point: { x: this.center.x, y: this.center.y - this.radius - 10 }, metadata: { center: this.center, isReference: true } },
            { object: this, type: GripType.SCALE, point: { x: this.center.x + this.radius + 10, y: this.center.y }, metadata: { center: this.center, isReference: true } },
        ];
    }

    getSnapPoints(app?: App): Point[] {
        return [this.getCenter(app), this.getStartPoint(), this.getEndPoint(), this.getMidPoint()];
    }

    rotate(angle: number, center: Point, app?: App): void {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const translatedX = this.center.x - center.x;
        const translatedY = this.center.y - center.y;
        this.center.x = center.x + translatedX * cos - translatedY * sin;
        this.center.y = center.y + translatedX * sin + translatedY * cos;
        this.startAngle += angle;
        this.endAngle += angle;
    }

    scale(factor: number, center: Point, app?: App): void {
        const translatedX = this.center.x - center.x;
        const translatedY = this.center.y - center.y;
        this.center.x = center.x + translatedX * factor;
        this.center.y = center.y + translatedY * factor;
        this.radius *= factor;
    }

    clone(newId: number, app?: App): ArcObject {
        const newArc = new ArcObject(newId, { ...this.center }, this.radius, this.startAngle, this.endAngle, this.counterClockwise);
        newArc.color = this.color;
        newArc.lineWidth = this.lineWidth;
        return newArc;
    }

    toJSON() {
        return {
            type: 'arc',
            id: this.id,
            center: this.center,
            radius: this.radius,
            startAngle: this.startAngle,
            endAngle: this.endAngle,
            counterClockwise: this.counterClockwise,
            color: this.color,
            lineWidth: this.lineWidth,
        };
    }

    static fromJSON(data: any): ArcObject {
        const arc = new ArcObject(data.id, data.center, data.radius, data.startAngle, data.endAngle, data.counterClockwise);
        arc.color = data.color ?? getComputedStyle(document.documentElement).getPropertyValue('--wall-color').trim();
        arc.lineWidth = data.lineWidth ?? 1;
        return arc;
    }
}
