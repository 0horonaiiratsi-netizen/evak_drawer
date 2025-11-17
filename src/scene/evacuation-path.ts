/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "../app";
import { Grip, GripType } from "../grips";
import { distance } from "../utils/geometry";
import { Point } from "./point";
import { BoundingBox, SceneObject } from "./scene-object";

export class EvacuationPath implements SceneObject {
    id: number;
    points: Point[];
    color: string;
    width: number;

    constructor(id: number, points: Point[]) {
        this.id = id;
        this.points = points;
        this.color = '#4CAF50'; // Green color for evacuation routes
        this.width = 5; // Width in world units
    }

    contains(point: Point, tolerance: number, app?: App): boolean {
        if (this.points.length < 2) return false;

        // Both tolerance and width are in world units
        const effectiveTolerance = tolerance + (this.width / 2);

        for (let i = 0; i < this.points.length - 1; i++) {
            const p1 = this.points[i];
            const p2 = this.points[i + 1];
            
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;

            if (dx === 0 && dy === 0) { // It's a point, not a line segment
                if (distance(point, p1) <= effectiveTolerance) return true;
                continue;
            }

            const t = ((point.x - p1.x) * dx + (point.y - p1.y) * dy) / (dx * dx + dy * dy);
            const clampedT = Math.max(0, Math.min(1, t));
            const closestPoint = { x: p1.x + clampedT * dx, y: p1.y + clampedT * dy };
            
            if (distance(point, closestPoint) <= effectiveTolerance) {
                return true;
            }
        }
        return false;
    }

    draw(ctx: CanvasRenderingContext2D, isSelected: boolean, zoom: number, allVisibleObjects: readonly SceneObject[], app: App): void {
        if (this.points.length < 2) return;

        const selectedColor = getComputedStyle(document.documentElement).getPropertyValue('--selected-stroke-color');
        
        ctx.strokeStyle = isSelected ? selectedColor : this.color;
        // Line width is in world units. For selection, add a screen-space border.
        ctx.lineWidth = isSelected ? this.width + 2 / zoom : this.width;
        ctx.lineCap = 'butt'; // Sharp ends
        ctx.lineJoin = 'miter'; // Sharp corners

        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);
        
        // Draw all segments except the very last one
        for (let i = 1; i < this.points.length - 1; i++) {
            ctx.lineTo(this.points[i].x, this.points[i].y);
        }

        // For the last segment, shorten it so it doesn't overlap with the arrowhead
        const p2 = this.points[this.points.length - 1]; // last point
        const p1 = this.points[this.points.length - 2]; // second to last point
        
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        // The arrowhead base is drawn at -arrowSize * 0.8 from the tip.
        const arrowLength = this.width * 3 * 0.8; 
        const lineEndX = p2.x - arrowLength * Math.cos(angle);
        const lineEndY = p2.y - arrowLength * Math.sin(angle);
        
        ctx.lineTo(lineEndX, lineEndY);
        ctx.stroke();

        // Draw arrowhead at the very end of the last segment
        this.drawArrowhead(ctx, p1, p2);
    }
    
    private drawArrowhead(ctx: CanvasRenderingContext2D, p1: Point, p2: Point): void {
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        // Arrow size is now proportional to the world-space line width.
        const arrowSize = this.width * 3;

        ctx.save();
        ctx.fillStyle = ctx.strokeStyle; // Use same color as the line
        ctx.beginPath();
        ctx.translate(p2.x, p2.y);
        ctx.rotate(angle);
        ctx.moveTo(0, 0);
        ctx.lineTo(-arrowSize, -arrowSize / 2);
        ctx.lineTo(-arrowSize * 0.8, 0); // Make the arrow look more pointy
        ctx.lineTo(-arrowSize, arrowSize / 2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }


    getBoundingBox(app?: App): BoundingBox {
        if (this.points.length === 0) {
            return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
        }
        const halfWidth = this.width / 2;
        const minX = Math.min(...this.points.map(p => p.x)) - halfWidth;
        const minY = Math.min(...this.points.map(p => p.y)) - halfWidth;
        const maxX = Math.max(...this.points.map(p => p.x)) + halfWidth;
        const maxY = Math.max(...this.points.map(p => p.y)) + halfWidth;
        return { minX, minY, maxX, maxY };
    }

    move(dx: number, dy: number, app?: App): void {
        for (const point of this.points) {
            point.x += dx;
            point.y += dy;
        }
    }
    
    getCenter(app?: App): Point {
        const bbox = this.getBoundingBox(app);
        return {
            x: bbox.minX + (bbox.maxX - bbox.minX) / 2,
            y: bbox.minY + (bbox.maxY - bbox.minY) / 2,
        };
    }

    getLength(): number {
        if (this.points.length < 2) {
            return 0;
        }
        let totalLength = 0;
        for (let i = 0; i < this.points.length - 1; i++) {
            totalLength += distance(this.points[i], this.points[i + 1]);
        }
        return totalLength;
    }

    getGrips(app?: App): Grip[] {
        const grips: Grip[] = [
            { object: this, type: GripType.MOVE, point: this.getCenter(app) }
        ];
        this.points.forEach((p, i) => {
            grips.push({ object: this, type: GripType.STRETCH, point: p, metadata: { pointIndex: i } });
        });
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
        const scalePoint = (p: Point) => {
            const translatedX = p.x - center.x;
            const translatedY = p.y - center.y;
            p.x = center.x + translatedX * factor;
            p.y = center.y + translatedY * factor;
        };
        this.points.forEach(scalePoint);
        this.width *= factor;
    }

    clone(newId: number, app?: App): EvacuationPath {
        // Deep copy of points array
        const newPoints = this.points.map(p => ({ ...p }));
        const newPath = new EvacuationPath(newId, newPoints);
        newPath.color = this.color;
        newPath.width = this.width;
        return newPath;
    }

    toJSON() {
        return {
            type: 'evacuationPath',
            id: this.id,
            points: this.points,
            color: this.color,
            width: this.width,
        };
    }

    static fromJSON(data: any): EvacuationPath {
        const path = new EvacuationPath(data.id, data.points);
        path.color = data.color ?? '#4CAF50';
        path.width = data.width ?? 5;
        return path;
    }
}
