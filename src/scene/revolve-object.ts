/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from '../app';
import { BoundingBox, SceneObject } from './scene-object';
import { Point } from './point';
import { Grip } from '../grips';
import { PolylineObject } from './polyline-object';
import { SketchObject } from './sketch-object';

declare const THREE: any;

/**
 * Represents a 3D object created by revolving a 2D profile around an axis.
 */
export class RevolveObject implements SceneObject {
    id: number;
    sourceObjectId: number;
    axisStart: Point;
    axisEnd: Point;
    angle: number; // in radians
    // FIX: Add isHidden property to conform to SceneObject and allow hiding.
    isHidden?: boolean;
    filletRadius: number = 0; // Radius for fillet on edges
    chamferDistance: number = 0; // Distance for chamfer on edges
    private mesh: any | null = null; // THREE.Mesh

    constructor(id: number, sourceObjectId: number, axisStart: Point, axisEnd: Point, angle: number = 2 * Math.PI) {
        this.id = id;
        this.sourceObjectId = sourceObjectId;
        this.axisStart = axisStart;
        this.axisEnd = axisEnd;
        this.angle = angle;
    }

    private getSourceShape(app: App): SceneObject | undefined {
        // FIX: Use sceneService to access objects.
        return app.sceneService.findById(this.sourceObjectId);
    }
    
    getOrCreateMesh(app: App): any { // THREE.Mesh
        if (this.mesh) {
            return this.mesh;
        }

        const sourceObject = this.getSourceShape(app);
        if (!sourceObject || !(sourceObject instanceof PolylineObject || sourceObject instanceof SketchObject)) {
            const placeholderGeom = new THREE.BoxGeometry(10, 10, 10);
            const placeholderMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
            return new THREE.Mesh(placeholderGeom, placeholderMat);
        }

        let points: Point[] = [];
        if (sourceObject instanceof PolylineObject) {
            points = sourceObject.points;
        } else if (sourceObject instanceof SketchObject) {
            sourceObject.objects.forEach(obj => {
                if (obj instanceof PolylineObject) {
                    points.push(...obj.points);
                }
            });
        }
        
        if (points.length < 2) {
             const placeholderGeom = new THREE.BoxGeometry(10, 10, 10);
             const placeholderMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
             this.mesh = new THREE.Mesh(placeholderGeom, placeholderMat);
             return this.mesh;
        }
        
        // Vector of the revolution axis
        const axisVec = { x: this.axisEnd.x - this.axisStart.x, y: this.axisEnd.y - this.axisStart.y };
        const axisLen = Math.sqrt(axisVec.x * axisVec.x + axisVec.y * axisVec.y);
        if (axisLen < 1e-6) return null; // Invalid axis
        const axisDir = { x: axisVec.x / axisLen, y: axisVec.y / axisLen };
        
        const lathePoints = points.map(p => {
            const pVec = { x: p.x - this.axisStart.x, y: p.y - this.axisStart.y };
            // Distance along axis (becomes 'y' for LatheGeometry)
            const y = pVec.x * axisDir.x + pVec.y * axisDir.y;
            // Perpendicular distance from axis (becomes 'x' for LatheGeometry)
            const x = Math.abs(pVec.x * axisDir.y - pVec.y * axisDir.x);
            return new THREE.Vector2(x, y);
        });
        
        const geometry = new THREE.LatheGeometry(lathePoints, 32, 0, this.angle);
        const material = new THREE.MeshStandardMaterial({ color: 0xcc7a00, roughness: 0.5, metalness: 0.1, side: THREE.DoubleSide });
        this.mesh = new THREE.Mesh(geometry, material);

        // Apply fillet if set (basic approximation)
        if (this.filletRadius > 0) {
            geometry.scale(1 - this.filletRadius / 100, 1, 1 - this.filletRadius / 100);
        }

        // Chamfer not directly applicable to LatheGeometry, skip for now
        
        // Transform the mesh from its local Lathe-space back to world space
        const axisAngle = Math.atan2(axisDir.y, axisDir.x);
        this.mesh.rotation.z = axisAngle - Math.PI / 2; // Align mesh's 'Y' with our axis
        this.mesh.position.set(this.axisStart.x, this.axisStart.y, 0);

        return this.mesh;
    }

    // --- SceneObject Interface ---
    draw(ctx: CanvasRenderingContext2D, isSelected: boolean, zoom: number, allVisibleObjects: readonly SceneObject[], app: App): void {
        const sourceObject = this.getSourceShape(app);
        if (sourceObject) {
            sourceObject.draw(ctx, isSelected, zoom, allVisibleObjects, app);
        }
    }
    
    contains(point: Point, tolerance: number, app?: App): boolean {
        const sourceObject = this.getSourceShape(app!);
        return sourceObject?.contains(point, tolerance, app) || false;
    }

    getBoundingBox(app?: App): BoundingBox {
        const sourceObject = this.getSourceShape(app!);
        return sourceObject?.getBoundingBox(app) || { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }
    
    move(dx: number, dy: number, app?: App): void {
        const sourceObject = this.getSourceShape(app!);
        sourceObject?.move(dx, dy, app);
        this.axisStart.x += dx;
        this.axisStart.y += dy;
        this.axisEnd.x += dx;
        this.axisEnd.y += dy;
        this.mesh = null; // Invalidate mesh
    }

    rotate(angle: number, center: Point, app?: App): void {
        const sourceObject = this.getSourceShape(app!);
        sourceObject?.rotate(angle, center, app);
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const rotatePoint = (p: Point) => {
            const translatedX = p.x - center.x;
            const translatedY = p.y - center.y;
            p.x = center.x + translatedX * cos - translatedY * sin;
            p.y = center.y + translatedX * sin + translatedY * cos;
        };
        rotatePoint(this.axisStart);
        rotatePoint(this.axisEnd);
        this.mesh = null;
    }

    scale(factor: number, center: Point, app?: App): void {
        const sourceObject = this.getSourceShape(app!);
        sourceObject?.scale(factor, center, app);
        const scalePoint = (p: Point) => {
            const translatedX = p.x - center.x;
            const translatedY = p.y - center.y;
            p.x = center.x + translatedX * factor;
            p.y = center.y + translatedY * factor;
        };
        scalePoint(this.axisStart);
        scalePoint(this.axisEnd);
        this.mesh = null;
    }
    
    clone(newId: number, app?: App): SceneObject {
        const sourceObject = this.getSourceShape(app!);
        if (sourceObject) {
            // FIX: Use sceneService for getting next ID.
            const newSource = sourceObject.clone(app!.sceneService.getNextId(), app);
            app!.addSceneObject(newSource, false);
            const newRevolve = new RevolveObject(newId, newSource.id, { ...this.axisStart }, { ...this.axisEnd }, this.angle);
            newRevolve.isHidden = this.isHidden;
            return newRevolve;
        }
        const newRevolve = new RevolveObject(newId, -1, { ...this.axisStart }, { ...this.axisEnd }, this.angle);
        newRevolve.isHidden = this.isHidden;
        return newRevolve;
    }

    getCenter(app?: App): Point {
        const sourceObject = this.getSourceShape(app!);
        return sourceObject?.getCenter(app) || { x: 0, y: 0 };
    }

    getSnapPoints(app?: App): Point[] {
        const sourceObject = this.getSourceShape(app!);
        return sourceObject?.getSnapPoints(app) || [];
    }

    getGrips(app?: App): Grip[] {
        const sourceObject = this.getSourceShape(app!);
        return sourceObject?.getGrips(app) || [];
    }
    
    toJSON(): any {
        return {
            type: 'revolveObject',
            id: this.id,
            sourceObjectId: this.sourceObjectId,
            axisStart: this.axisStart,
            axisEnd: this.axisEnd,
            angle: this.angle,
            isHidden: this.isHidden,
            filletRadius: this.filletRadius,
            chamferDistance: this.chamferDistance,
        };
    }

    static fromJSON(data: any, app: App): RevolveObject {
        const obj = new RevolveObject(data.id, data.sourceObjectId, data.axisStart, data.axisEnd, data.angle);
        obj.isHidden = data.isHidden;
        return obj;
    }
}
