/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "../app";
import { Grip, GripType } from "../grips";
import { Point } from "./point";
import { BoundingBox, SceneObject } from "./scene-object";

export enum HatchPattern {
    SOLID = 'SOLID',
    LINES = 'LINES',
    CROSS = 'CROSS',
}

export class HatchObject implements SceneObject {
    id: number;
    boundary: Point[];
    pattern: HatchPattern;
    patternScale: number;
    angle: number; // in radians
    color: string;

    constructor(id: number, boundary: Point[]) {
        this.id = id;
        this.boundary = boundary;
        this.pattern = HatchPattern.LINES;
        this.patternScale = 20;
        this.angle = 0;
        this.color = getComputedStyle(document.documentElement).getPropertyValue('--wall-color').trim();
    }

    contains(point: Point, tolerance: number, app?: App): boolean {
        // Point-in-polygon test (ray casting algorithm)
        let inside = false;
        for (let i = 0, j = this.boundary.length - 1; i < this.boundary.length; j = i++) {
            const xi = this.boundary[i].x, yi = this.boundary[i].y;
            const xj = this.boundary[j].x, yj = this.boundary[j].y;

            const intersect = ((yi > point.y) !== (yj > point.y))
                && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    draw(ctx: CanvasRenderingContext2D, isSelected: boolean, zoom: number, allVisibleObjects: readonly SceneObject[], app: App): void {
        if (this.boundary.length < 3) return;

        ctx.save();
        const selectedColor = getComputedStyle(document.documentElement).getPropertyValue('--selected-stroke-color');
        
        // Create clipping path from the boundary
        ctx.beginPath();
        ctx.moveTo(this.boundary[0].x, this.boundary[0].y);
        for (let i = 1; i < this.boundary.length; i++) {
            ctx.lineTo(this.boundary[i].x, this.boundary[i].y);
        }
        ctx.closePath();
        
        if (isSelected) {
            ctx.strokeStyle = selectedColor;
            ctx.lineWidth = 2 / zoom;
            ctx.stroke();
        }
        
        ctx.clip();

        // Draw the pattern
        ctx.fillStyle = this.color;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1 / zoom;

        switch (this.pattern) {
            case HatchPattern.SOLID:
                ctx.fill();
                break;
            case HatchPattern.LINES:
                this.drawLines(ctx, this.getBoundingBox(app));
                break;
            case HatchPattern.CROSS:
                this.drawLines(ctx, this.getBoundingBox(app));
                this.drawLines(ctx, this.getBoundingBox(app), Math.PI / 2); // Draw perpendicular lines
                break;
        }

        ctx.restore();
    }

    private drawLines(ctx: CanvasRenderingContext2D, bbox: BoundingBox, angleOffset = 0): void {
        ctx.save();
        
        const center = this.getCenter();
        ctx.translate(center.x, center.y);
        ctx.rotate(this.angle + angleOffset);
        ctx.translate(-center.x, -center.y);

        const maxLength = Math.sqrt(Math.pow(bbox.maxX - bbox.minX, 2) + Math.pow(bbox.maxY - bbox.minY, 2));
        const startX = center.x - maxLength / 2;
        const startY = center.y - maxLength / 2;
        const endX = center.x + maxLength / 2;
        const endY = center.y + maxLength / 2;
        
        ctx.beginPath();
        for (let i = -maxLength / 2; i < maxLength / 2; i += this.patternScale) {
             ctx.moveTo(startX, startY + i);
             ctx.lineTo(endX, startY + i);
        }
        ctx.stroke();
        
        ctx.restore();
    }

    getBoundingBox(app?: App): BoundingBox {
        if (this.boundary.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
        return {
            minX: Math.min(...this.boundary.map(p => p.x)),
            minY: Math.min(...this.boundary.map(p => p.y)),
            maxX: Math.max(...this.boundary.map(p => p.x)),
            maxY: Math.max(...this.boundary.map(p => p.y)),
        };
    }

    move(dx: number, dy: number, app?: App): void {
        this.boundary.forEach(p => {
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
        this.boundary.forEach((p, i) => {
            grips.push({ object: this, type: GripType.STRETCH, point: p, metadata: { pointIndex: i } });
        });
        return grips;
    }

    getSnapPoints(app?: App): Point[] {
        return [...this.boundary, this.getCenter(app)];
    }

    rotate(angle: number, center: Point, app?: App): void {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        this.boundary.forEach(p => {
            const translatedX = p.x - center.x;
            const translatedY = p.y - center.y;
            p.x = center.x + translatedX * cos - translatedY * sin;
            p.y = center.y + translatedX * sin + translatedY * cos;
        });
    }

    scale(factor: number, center: Point, app?: App): void {
        this.boundary.forEach(p => {
            const translatedX = p.x - center.x;
            const translatedY = p.y - center.y;
            p.x = center.x + translatedX * factor;
            p.y = center.y + translatedY * factor;
        });
    }

    clone(newId: number, app?: App): HatchObject {
        const newBoundary = this.boundary.map(p => ({...p}));
        const newHatch = new HatchObject(newId, newBoundary);
        newHatch.pattern = this.pattern;
        newHatch.patternScale = this.patternScale;
        newHatch.angle = this.angle;
        newHatch.color = this.color;
        return newHatch;
    }

    toJSON() {
        return {
            type: 'hatch',
            id: this.id,
            boundary: this.boundary,
            pattern: this.pattern,
            patternScale: this.patternScale,
            angle: this.angle,
            color: this.color,
        };
    }

    static fromJSON(data: any): HatchObject {
        const hatch = new HatchObject(data.id, data.boundary);
        hatch.pattern = data.pattern ?? HatchPattern.LINES;
        hatch.patternScale = data.patternScale ?? data.scale ?? 20;
        hatch.angle = data.angle ?? 0;
        hatch.color = data.color ?? getComputedStyle(document.documentElement).getPropertyValue('--wall-color').trim();
        return hatch;
    }
}
