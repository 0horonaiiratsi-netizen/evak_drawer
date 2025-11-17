/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { App } from "../app";
import { Grip, GripType } from "../grips";
import { Point } from "./point";
import { BoundingBox, SceneObject } from "./scene-object";

export class PdfUnderlay implements SceneObject {
    id: number;
    x: number;
    y: number;
    width: number;
    height: number;
    image: HTMLImageElement;
    opacity: number = 0.5;
    angle: number = 0;

    constructor(id: number, x: number, y: number, width: number, height: number, image: HTMLImageElement) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.image = image;
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
        if (!this.image || !this.image.complete || this.width === 0 || this.height === 0) {
            return; // Don't draw if image is not loaded or has no dimensions
        }

        ctx.save();
        ctx.globalAlpha = this.opacity;
        
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        ctx.drawImage(this.image, -this.width / 2, -this.height / 2, this.width, this.height);

        ctx.globalAlpha = 1.0;

        if (isSelected) {
            const selectedColor = getComputedStyle(document.documentElement).getPropertyValue('--selected-stroke-color');
            ctx.strokeStyle = selectedColor;
            ctx.lineWidth = 2 / zoom;
            ctx.setLineDash([6 / zoom, 4 / zoom]);
            ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);
            ctx.setLineDash([]);
        }
        ctx.restore();
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
        const transformedCorners = this.getRectangleCorners();
        return {
            minX: Math.min(...transformedCorners.map(p => p.x)),
            minY: Math.min(...transformedCorners.map(p => p.y)),
            maxX: Math.max(...transformedCorners.map(p => p.x)),
            maxY: Math.max(...transformedCorners.map(p => p.y)),
        };
    }
    
    getCenter(app?: App): Point {
        return { x: this.x, y: this.y };
    }

    getSnapPoints(app?: App): Point[] {
        return [this.getCenter(app), ...this.getRectangleCorners()];
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
        const translatedX = this.x - center.x;
        const translatedY = this.y - center.y;
        this.x = center.x + translatedX * factor;
        this.y = center.y + translatedY * factor;

        this.width *= factor;
        this.height *= factor;
    }

    clone(newId: number, app?: App): PdfUnderlay {
        const newUnderlay = new PdfUnderlay(newId, this.x, this.y, this.width, this.height, this.image);
        newUnderlay.opacity = this.opacity;
        newUnderlay.angle = this.angle;
        return newUnderlay;
    }

    toJSON() {
        const canvas = document.createElement('canvas');
        canvas.width = this.image.naturalWidth;
        canvas.height = this.image.naturalHeight;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
            console.warn(`Could not create canvas context to serialize PdfUnderlay ID ${this.id}. Image data will be lost.`);
            return {
                type: 'pdfUnderlay', id: this.id, x: this.x, y: this.y,
                width: this.width, height: this.height, opacity: this.opacity,
                angle: this.angle, imageData: null,
            };
        }
        
        ctx.drawImage(this.image, 0, 0);
        const imageData = canvas.toDataURL();

        return {
            type: 'pdfUnderlay',
            id: this.id,
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            opacity: this.opacity,
            angle: this.angle,
            imageData: imageData,
        };
    }

    static fromJSON(data: any, app: App): PdfUnderlay {
        const image = new Image();
        const underlay = new PdfUnderlay(data.id, data.x, data.y, data.width ?? 0, data.height ?? 0, image);
        underlay.opacity = data.opacity ?? 0.5;
        underlay.angle = data.angle ?? 0;

        image.onload = () => {
            const isOldFormat = typeof data.width === 'undefined' || typeof data.height === 'undefined';
            
            if (isOldFormat) {
                underlay.width = image.naturalWidth;
                underlay.height = image.naturalHeight;
                underlay.x = data.x + image.naturalWidth / 2;
                underlay.y = data.y + image.naturalHeight / 2;
            } else {
                underlay.width = data.width;
                underlay.height = data.height;
            }
            app.draw();
        };
        
        if (data.imageData) {
            image.src = data.imageData;
        } else {
            console.warn(`PdfUnderlay with ID ${data.id} has no image data.`);
        }

        return underlay;
    }
}
