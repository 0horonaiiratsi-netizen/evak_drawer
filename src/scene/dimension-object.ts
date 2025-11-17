/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "../app";
import { Grip, GripType } from "../grips";
import { StyleManager } from "../style-manager";
import { ArrowType, DimensionStyle } from "../styles/dimension-style";
import { Point } from "./point";
import { BoundingBox, SceneObject } from "./scene-object";

export abstract class DimensionObject implements SceneObject {
    id: number;
    styleName: string;
    defPoint1: Point;
    defPoint2: Point;
    dimLinePoint: Point;
    textOverride?: string;

    constructor(id: number, defPoint1: Point, defPoint2: Point, dimLinePoint: Point, styleName: string) {
        this.id = id;
        this.defPoint1 = defPoint1;
        this.defPoint2 = defPoint2;
        this.dimLinePoint = dimLinePoint;
        this.styleName = styleName;
    }

    protected drawArrow(ctx: CanvasRenderingContext2D, p: Point, angle: number, style: DimensionStyle) {
        const size = style.arrowSize;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(angle);
        
        ctx.fillStyle = ctx.strokeStyle;
        ctx.beginPath();
        switch (style.arrowType) {
            case ArrowType.ARROW:
                ctx.moveTo(0, 0);
                ctx.lineTo(-size, -size / 3);
                ctx.lineTo(-size * 0.9, 0);
                ctx.lineTo(-size, size / 3);
                ctx.closePath();
                ctx.fill();
                break;
            case ArrowType.TICK:
                ctx.rotate(Math.PI / 4);
                ctx.moveTo(0, -size / 2);
                ctx.lineTo(0, size / 2);
                ctx.stroke();
                break;
            case ArrowType.DOT:
                ctx.arc(0, 0, size / 4, 0, 2 * Math.PI);
                ctx.fill();
                break;
        }
        ctx.restore();
    }

    abstract draw(ctx: CanvasRenderingContext2D, isSelected: boolean, zoom: number, allVisibleObjects: readonly SceneObject[], app: App): void;
    
    getBoundingBox(app?: App): BoundingBox {
        // This is an approximation
        const allX = [this.defPoint1.x, this.defPoint2.x, this.dimLinePoint.x];
        const allY = [this.defPoint1.y, this.defPoint2.y, this.dimLinePoint.y];
        return {
            minX: Math.min(...allX) - 20,
            minY: Math.min(...allY) - 20,
            maxX: Math.max(...allX) + 20,
            maxY: Math.max(...allY) + 20,
        };
    }
    
    contains(point: Point, tolerance: number, app?: App): boolean {
        // Simplified check against bounding box
        const bbox = this.getBoundingBox(app);
        return point.x >= bbox.minX && point.x <= bbox.maxX &&
               point.y >= bbox.minY && point.y <= bbox.maxY;
    }
    
    move(dx: number, dy: number, app?: App): void {
        this.defPoint1.x += dx; this.defPoint1.y += dy;
        this.defPoint2.x += dx; this.defPoint2.y += dy;
        this.dimLinePoint.x += dx; this.dimLinePoint.y += dy;
    }
    
    rotate(angle: number, center: Point, app?: App): void {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const rotatePoint = (p: Point) => {
            const translatedX = p.x - center.x;
            const translatedY = p.y - center.y;
            p.x = center.x + translatedX * cos - translatedY * sin;
            p.y = center.y + translatedX * sin + translatedY * cos;
        };
        rotatePoint(this.defPoint1);
        rotatePoint(this.defPoint2);
        rotatePoint(this.dimLinePoint);
    }
    
    scale(factor: number, center: Point, app?: App): void {
        const scalePoint = (p: Point) => {
            const translatedX = p.x - center.x;
            const translatedY = p.y - center.y;
            p.x = center.x + translatedX * factor;
            p.y = center.y + translatedY * factor;
        };
        scalePoint(this.defPoint1);
        scalePoint(this.defPoint2);
        scalePoint(this.dimLinePoint);
    }
    
    abstract clone(newId: number, app?: App): SceneObject;
    
    getCenter(app?: App): Point {
        return { x: (this.defPoint1.x + this.defPoint2.x) / 2, y: (this.defPoint1.y + this.defPoint2.y) / 2};
    }
    
    getSnapPoints(app?: App): Point[] { return []; } // Dimensions don't offer snap points
    
    getGrips(app?: App): Grip[] {
        return [
            { object: this, type: GripType.STRETCH, point: this.defPoint1, metadata: { pointName: 'defPoint1' } },
            { object: this, type: GripType.STRETCH, point: this.defPoint2, metadata: { pointName: 'defPoint2' } },
            { object: this, type: GripType.STRETCH, point: this.dimLinePoint, metadata: { pointName: 'dimLinePoint' } },
        ];
    }
    
    abstract toJSON(): any;
}
