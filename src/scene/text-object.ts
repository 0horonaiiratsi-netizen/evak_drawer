/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "../app";
import { Grip, GripType } from "../grips";
import { StyleManager } from "../style-manager";
import { Point } from "./point";
import { BoundingBox, SceneObject } from "./scene-object";

export class TextObject implements SceneObject {
    id: number;
    x: number;
    y: number;
    text: string;
    height: number;
    color: string;
    styleName: string;
    angle: number;

    private measuredWidth: number = 0;
    private measuredHeight: number = 0;

    constructor(id: number, x: number, y: number, text: string = 'Текст', styleName: string = 'Standard') {
        this.id = id;
        this.x = x;
        this.y = y;
        this.text = text;
        this.height = 24; // Default height
        this.color = getComputedStyle(document.documentElement).getPropertyValue('--wall-color').trim();
        this.styleName = styleName;
        this.angle = 0;
    }

    private getFontString(styleManager: StyleManager): string {
        const style = styleManager.getTextStyle(this.styleName);
        const fontFamily = style?.fontFamily || 'system-ui, sans-serif';
        return `${this.height}px ${fontFamily}`;
    }

    private measure(ctx: CanvasRenderingContext2D, styleManager: StyleManager) {
        ctx.font = this.getFontString(styleManager);
        const metrics = ctx.measureText(this.text);
        this.measuredWidth = metrics.width;
        this.measuredHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    }
    
    getCenter(app?: App): Point {
        const w_half = this.measuredWidth / 2;
        const h_half = this.measuredHeight / 2;
        
        // This calculates the center of the bounding box after rotation
        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);

        const centerX = this.x + w_half * cos - h_half * sin;
        const centerY = this.y + w_half * sin + h_half * cos;

        return { x: centerX, y: centerY };
    }

    contains(point: Point, tolerance: number, app?: App): boolean {
        const corners = this.getRectangleCorners(app);
        // Simple point-in-polygon check for a convex rectangle
        let inside = false;
        for (let i = 0, j = corners.length - 1; i < corners.length; j = i++) {
            const xi = corners[i].x, yi = corners[i].y;
            const xj = corners[j].x, yj = corners[j].y;
            const intersect = ((yi > point.y) !== (yj > point.y))
                && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    draw(ctx: CanvasRenderingContext2D, isSelected: boolean, zoom: number, allVisibleObjects: readonly SceneObject[], app: App): void {
        ctx.save();
        this.measure(ctx, app.styleManager);

        ctx.font = this.getFontString(app.styleManager);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.translate(-this.x, -this.y);

        ctx.fillStyle = this.color;
        ctx.fillText(this.text, this.x, this.y);

        if (isSelected) {
            const selectedColor = getComputedStyle(document.documentElement).getPropertyValue('--selected-stroke-color');
            ctx.strokeStyle = selectedColor;
            ctx.lineWidth = 1 / zoom;
            ctx.strokeRect(this.x, this.y, this.measuredWidth, this.measuredHeight);
        }

        ctx.restore();
    }

    getRectangleCorners(app?: App): [Point, Point, Point, Point] {
        const w = this.measuredWidth;
        const h = this.measuredHeight;
        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);
        const x = this.x;
        const y = this.y;

        const corners = [
            { x: 0, y: 0 }, { x: w, y: 0 },
            { x: w, y: h }, { x: 0, y: h }
        ];

        const transformedCorners = corners.map(p => ({
            x: x + p.x * cos - p.y * sin,
            y: y + p.x * sin + p.y * cos,
        }));

        return [transformedCorners[0], transformedCorners[1], transformedCorners[2], transformedCorners[3]];
    }

    getBoundingBox(app?: App): BoundingBox {
        const transformedCorners = this.getRectangleCorners(app);
        return {
            minX: Math.min(...transformedCorners.map(p => p.x)),
            minY: Math.min(...transformedCorners.map(p => p.y)),
            maxX: Math.max(...transformedCorners.map(p => p.x)),
            maxY: Math.max(...transformedCorners.map(p => p.y)),
        };
    }

    move(dx: number, dy: number, app?: App): void {
        this.x += dx;
        this.y += dy;
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
        const currentCenter = this.getCenter(app);
        const translatedX = currentCenter.x - center.x;
        const translatedY = currentCenter.y - center.y;
    
        const newCenterX = center.x + translatedX * factor;
        const newCenterY = center.y + translatedY * factor;
    
        const deltaX = newCenterX - currentCenter.x;
        const deltaY = newCenterY - currentCenter.y;
    
        this.x += deltaX;
        this.y += deltaY;
    
        this.height *= factor;
    }

    getGrips(app?: App): Grip[] {
        const center = this.getCenter(app);
        const corners = this.getRectangleCorners(app);
        const grips: Grip[] = [
            { object: this, type: GripType.MOVE, point: center }
        ];

        corners.forEach((p, i) => {
            grips.push({ object: this, type: GripType.STRETCH, point: p, metadata: { pointIndex: i, center } });
        });
        
        const offset = this.measuredHeight/2 + 20;
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

    getSnapPoints(app?: App): Point[] {
        return [this.getCenter(app), ...this.getRectangleCorners(app)];
    }

    clone(newId: number, app?: App): TextObject {
        const newText = new TextObject(newId, this.x, this.y, this.text, this.styleName);
        newText.height = this.height;
        newText.color = this.color;
        newText.angle = this.angle;
        return newText;
    }

    toJSON() {
        return {
            type: 'text',
            id: this.id,
            x: this.x,
            y: this.y,
            text: this.text,
            height: this.height,
            color: this.color,
            styleName: this.styleName,
            angle: this.angle
        };
    }

    static fromJSON(data: any): TextObject {
        const textObj = new TextObject(data.id, data.x, data.y, data.text, data.styleName || 'Standard');
        textObj.height = data.height ?? data.fontSize ?? 24;
        textObj.color = data.color ?? getComputedStyle(document.documentElement).getPropertyValue('--wall-color').trim();
        textObj.angle = data.angle ?? 0;
        return textObj;
    }
}
