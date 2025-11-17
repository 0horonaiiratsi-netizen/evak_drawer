/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "../app";
import { Grip, GripType } from "../grips";
import { Point } from "./point";
import { BoundingBox, SceneObject } from "./scene-object";

/**
 * Represents an instance of a BlockDefinition at a specific location, rotation, and scale.
 */
export class BlockReference implements SceneObject {
    id: number;
    blockName: string;
    insertionPoint: Point;
    xScale: number;
    yScale: number;
    angle: number; // in radians

    constructor(id: number, blockName: string, insertionPoint: Point) {
        this.id = id;
        this.blockName = blockName;
        this.insertionPoint = insertionPoint;
        this.xScale = 1;
        this.yScale = 1;
        this.angle = 0;
    }

    draw(ctx: CanvasRenderingContext2D, isSelected: boolean, zoom: number, allVisibleObjects: readonly SceneObject[], app: App): void {
        const blockDef = app.projectStateService.blockDefinitions.get(this.blockName);
        
        if (!blockDef) {
            // Draw a placeholder 'X' if the block definition is not found.
            ctx.save();
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = 1 / zoom;
            ctx.translate(this.insertionPoint.x, this.insertionPoint.y);
            ctx.rotate(this.angle);
            const size = 20 / zoom;
            ctx.beginPath();
            ctx.moveTo(-size, -size);
            ctx.lineTo(size, size);
            ctx.moveTo(-size, size);
            ctx.lineTo(size, -size);
            ctx.stroke();
            ctx.restore();
            return;
        }

        ctx.save();
        ctx.translate(this.insertionPoint.x, this.insertionPoint.y);
        ctx.rotate(this.angle);
        ctx.scale(this.xScale, this.yScale);

        // Draw objects from the definition. Their coordinates are already relative to the base point,
        // which is now at the origin of our transformed context.
        blockDef.objects.forEach(obj => {
            obj.draw(ctx, false, zoom, blockDef.objects, app);
        });

        ctx.restore();
        
        if (isSelected) {
            const bbox = this.getBoundingBox(app);
            ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--selected-stroke-color');
            ctx.lineWidth = 1 / zoom;
            ctx.setLineDash([4 / zoom, 2 / zoom]);
            ctx.strokeRect(bbox.minX, bbox.minY, bbox.maxX - bbox.minX, bbox.maxY - bbox.minY);
            ctx.setLineDash([]);
        }
    }
    
    contains(point: Point, tolerance: number, app?: App): boolean {
        // This is a simplified check against the bounding box.
        // For a more accurate check, we'd need to inverse-transform the point
        // and check against each child object.
        const bbox = this.getBoundingBox(app);
        return point.x >= bbox.minX - tolerance && point.x <= bbox.maxX + tolerance &&
               point.y >= bbox.minY - tolerance && point.y <= bbox.maxY + tolerance;
    }

    getBoundingBox(app?: App): BoundingBox {
        // Need the app instance to get the block definition
        const blockDef = app?.projectStateService.blockDefinitions.get(this.blockName);
        if (!blockDef || blockDef.objects.length === 0) {
            return { minX: this.insertionPoint.x, minY: this.insertionPoint.y, maxX: this.insertionPoint.x, maxY: this.insertionPoint.y };
        }
        
        const bboxes = blockDef.objects.map(obj => obj.getBoundingBox(app));
        const localBbox = {
            minX: Math.min(...bboxes.map(b => b.minX)),
            minY: Math.min(...bboxes.map(b => b.minY)),
            maxX: Math.max(...bboxes.map(b => b.maxX)),
            maxY: Math.max(...bboxes.map(b => b.maxY)),
        };

        const corners = [
            { x: localBbox.minX, y: localBbox.minY },
            { x: localBbox.maxX, y: localBbox.minY },
            { x: localBbox.maxX, y: localBbox.maxY },
            { x: localBbox.minX, y: localBbox.maxY },
        ];
        
        const transformedCorners = corners.map(p => {
            const scaledX = p.x * this.xScale;
            const scaledY = p.y * this.yScale;
            const rotatedX = scaledX * Math.cos(this.angle) - scaledY * Math.sin(this.angle);
            const rotatedY = scaledX * Math.sin(this.angle) + scaledY * Math.cos(this.angle);
            return {
                x: this.insertionPoint.x + rotatedX,
                y: this.insertionPoint.y + rotatedY,
            };
        });

        return {
            minX: Math.min(...transformedCorners.map(p => p.x)),
            minY: Math.min(...transformedCorners.map(p => p.y)),
            maxX: Math.max(...transformedCorners.map(p => p.x)),
            maxY: Math.max(...transformedCorners.map(p => p.y)),
        };
    }

    move(dx: number, dy: number, app?: App): void {
        this.insertionPoint.x += dx;
        this.insertionPoint.y += dy;
    }

    rotate(angle: number, center: Point, app?: App): void {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const translatedX = this.insertionPoint.x - center.x;
        const translatedY = this.insertionPoint.y - center.y;
        this.insertionPoint.x = center.x + translatedX * cos - translatedY * sin;
        this.insertionPoint.y = center.y + translatedX * sin + translatedY * cos;
        this.angle += angle;
    }

    scale(factor: number, center: Point, app?: App): void {
        const translatedX = this.insertionPoint.x - center.x;
        const translatedY = this.insertionPoint.y - center.y;
        this.insertionPoint.x = center.x + translatedX * factor;
        this.insertionPoint.y = center.y + translatedY * factor;
        this.xScale *= factor;
        this.yScale *= factor;
    }
    
    clone(newId: number, app?: App): BlockReference {
        const newRef = new BlockReference(newId, this.blockName, { ...this.insertionPoint });
        newRef.xScale = this.xScale;
        newRef.yScale = this.yScale;
        newRef.angle = this.angle;
        return newRef;
    }

    getCenter(app?: App): Point {
        return this.insertionPoint;
    }

    getSnapPoints(app?: App): Point[] {
        return [this.insertionPoint];
    }
    
    getGrips(app?: App): Grip[] {
        return [
            { object: this, type: GripType.MOVE, point: this.insertionPoint, metadata: { center: this.insertionPoint } }
        ];
    }

    toJSON(): any {
        return {
            type: 'blockReference',
            id: this.id,
            blockName: this.blockName,
            insertionPoint: this.insertionPoint,
            xScale: this.xScale,
            yScale: this.yScale,
            angle: this.angle,
        };
    }

    static fromJSON(data: any, app: App): BlockReference {
        const ref = new BlockReference(data.id, data.blockName, data.insertionPoint);
        ref.xScale = data.xScale ?? 1;
        ref.yScale = data.yScale ?? 1;
        ref.angle = data.angle ?? 0;
        return ref;
    }
}