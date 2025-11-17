/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "../app";
import { Grip, GripType } from "../grips";
import { Point } from "./point";
import { BoundingBox, SceneObject } from "./scene-object";

export enum StairsType {
    STAIRS = 'STAIRS',
    LADDER = 'LADDER',
}

export class StairsObject implements SceneObject {
    id: number;
    x: number;
    y: number;
    width: number;
    height: number;
    angle: number;
    stairsType: StairsType;
    color: string;

    constructor(id: number, x: number, y: number, width: number, height: number, stairsType: StairsType = StairsType.STAIRS) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.angle = 0;
        this.stairsType = stairsType;
        this.color = getComputedStyle(document.documentElement).getPropertyValue('--wall-color').trim();
    }

    contains(point: Point, tolerance: number, app?: App): boolean {
        const translatedPoint = { x: point.x - this.x, y: point.y - this.y };
        const cos = Math.cos(-this.angle);
        const sin = Math.sin(-this.angle);

        const rotatedPoint = {
            x: translatedPoint.x * cos - translatedPoint.y * sin,
            y: translatedPoint.x * sin + translatedPoint.y * cos
        };
        
        return (
            rotatedPoint.x >= -this.width / 2 - tolerance &&
            rotatedPoint.x <= this.width / 2 + tolerance &&
            rotatedPoint.y >= -this.height / 2 - tolerance &&
            rotatedPoint.y <= this.height / 2 + tolerance
        );
    }

    draw(ctx: CanvasRenderingContext2D, isSelected: boolean, zoom: number, allVisibleObjects: readonly SceneObject[], app: App): void {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        const selectedColor = getComputedStyle(document.documentElement).getPropertyValue('--selected-stroke-color');
        ctx.strokeStyle = isSelected ? selectedColor : this.color;
        ctx.lineWidth = isSelected ? 2 / zoom : 1 / zoom;

        // Draw bounding box
        ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);

        if (this.stairsType === StairsType.STAIRS) {
            this.drawStairs(ctx, zoom);
        } else {
            this.drawLadder(ctx, zoom);
        }

        ctx.restore();
    }

    private drawStairs(ctx: CanvasRenderingContext2D, zoom: number): void {
        const halfW = this.width / 2;
        const halfH = this.height / 2;
    
        // --- Draw Steps ---
        const numSteps = Math.max(3, Math.floor(this.height / 15));
        const stepSpacing = this.height / (numSteps - 1);
    
        ctx.beginPath();
        // Draw steps, including the top and bottom ones for a clearer look
        for (let i = 0; i < numSteps; i++) {
            const y = -halfH + i * stepSpacing;
            ctx.moveTo(-halfW, y);
            ctx.lineTo(halfW, y);
        }
        ctx.stroke();
    
        // --- Draw Direction Arrow ---
        const arrowMargin = stepSpacing;
        // Original start and end points for length calculation
        const originalArrowStartY = halfH - arrowMargin;
        const originalArrowEndY = -halfH + arrowMargin;

        // Calculate the new length (half of the original)
        const arrowLength = (originalArrowStartY - originalArrowEndY) * 0.5;

        // Center the new, shorter arrow
        const arrowStartY = arrowLength / 2;
        const arrowEndY = -arrowLength / 2;
        
        // Make arrow head size proportional to width but not too large
        const arrowHeadSize = Math.min(this.width * 0.3, stepSpacing * 0.6);
    
        ctx.beginPath();
        ctx.moveTo(0, arrowStartY);
        ctx.lineTo(0, arrowEndY);
        // Arrowhead
        ctx.lineTo(-arrowHeadSize, arrowEndY + arrowHeadSize);
        ctx.moveTo(0, arrowEndY);
        ctx.lineTo(arrowHeadSize, arrowEndY + arrowHeadSize);
        ctx.stroke();
    }
    
    private drawLadder(ctx: CanvasRenderingContext2D, zoom: number): void {
        const numRungs = Math.max(2, Math.floor(this.height / 20));
        const rungSpacing = this.height / (numRungs + 1);
        
        // Rails
        ctx.beginPath();
        ctx.moveTo(-this.width / 2, -this.height / 2);
        ctx.lineTo(-this.width / 2, this.height / 2);
        ctx.moveTo(this.width / 2, -this.height / 2);
        ctx.lineTo(this.width / 2, this.height / 2);
        ctx.stroke();

        // Rungs
        ctx.beginPath();
        for (let i = 1; i <= numRungs; i++) {
            const y = -this.height / 2 + i * rungSpacing;
            ctx.moveTo(-this.width / 2, y);
            ctx.lineTo(this.width / 2, y);
        }
        ctx.stroke();
    }


    getRectangleCorners(): [Point, Point, Point, Point] {
        const w_half = this.width / 2;
        const h_half = this.height / 2;
        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);

        const corners = [
            { x: -w_half, y: -h_half }, { x:  w_half, y: -h_half },
            { x:  w_half, y:  h_half }, { x: -w_half, y:  h_half },
        ];

        return corners.map(p => ({
            x: this.x + p.x * cos - p.y * sin,
            y: this.y + p.x * sin + p.y * cos,
        })) as [Point, Point, Point, Point];
    }

    getBoundingBox(app?: App): BoundingBox {
        const corners = this.getRectangleCorners();
        return {
            minX: Math.min(...corners.map(p => p.x)),
            minY: Math.min(...corners.map(p => p.y)),
            maxX: Math.max(...corners.map(p => p.x)),
            maxY: Math.max(...corners.map(p => p.y)),
        };
    }

    move(dx: number, dy: number, app?: App): void {
        this.x += dx;
        this.y += dy;
    }

    getCenter(app?: App): Point {
        return { x: this.x, y: this.y };
    }

    getSnapPoints(app?: App): Point[] {
        return [this.getCenter(app), ...this.getRectangleCorners()];
    }

    rotate(angle: number, center: Point, app?: App): void {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const translatedX = this.x - center.x;
        const translatedY = this.y - center.y;
        this.x = center.x + translatedX * cos - translatedY * sin;
        this.y = center.y + translatedX * sin + translatedY * cos;
        this.angle += angle;
    }

    scale(factor: number, center: Point, app?: App): void {
        const translatedX = this.x - center.x;
        const translatedY = this.y - center.y;
        this.x = center.x + translatedX * factor;
        this.y = center.y + translatedY * factor;
        this.width *= factor;
        this.height *= factor;
    }

    clone(newId: number, app?: App): StairsObject {
        const newStairs = new StairsObject(newId, this.x, this.y, this.width, this.height, this.stairsType);
        newStairs.angle = this.angle;
        newStairs.color = this.color;
        return newStairs;
    }

    getGrips(app?: App): Grip[] {
        const center = this.getCenter(app);
        const corners = this.getRectangleCorners();
        const grips: Grip[] = [
            { object: this, type: GripType.MOVE, point: center }
        ];

        corners.forEach((p, i) => {
            grips.push({ object: this, type: GripType.STRETCH, point: p, metadata: { pointIndex: i, center } });
        });
        
        const offset = this.height/2 + 20;
        const rotationHandlePoint = {
            x: center.x + offset * Math.sin(this.angle),
            y: center.y - offset * Math.cos(this.angle),
        };

        grips.push({
            object: this,
            type: GripType.ROTATE,
            point: rotationHandlePoint,
            metadata: { center }
        });

        return grips;
    }

    toJSON() {
        return {
            type: 'stairs',
            id: this.id,
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            angle: this.angle,
            stairsType: this.stairsType,
            color: this.color
        };
    }

    static fromJSON(data: any): StairsObject {
        const stairs = new StairsObject(data.id, data.x, data.y, data.width, data.height, data.stairsType);
        stairs.angle = data.angle ?? 0;
        stairs.color = data.color ?? getComputedStyle(document.documentElement).getPropertyValue('--wall-color').trim();
        return stairs;
    }
}
