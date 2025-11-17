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
 * Represents a 3D object created by sweeping a 2D profile along a 2D path.
 */
export class SweepObject implements SceneObject {
    id: number;
    profileId: number;
    pathId: number;
    isHidden?: boolean;
    private mesh: any | null = null; // THREE.Mesh

    constructor(id: number, profileId: number, pathId: number) {
        this.id = id;
        this.profileId = profileId;
        this.pathId = pathId;
    }

    private getProfileShape(app: App): SceneObject | undefined {
        // FIX: Use sceneService to access objects.
        return app.sceneService.findById(this.profileId);
    }
    
    private getPathShape(app: App): SceneObject | undefined {
        // FIX: Use sceneService to access objects.
        return app.sceneService.findById(this.pathId);
    }

    getOrCreateMesh(app: App): any { // THREE.Mesh
        if (this.mesh) {
            return this.mesh;
        }

        const profileObject = this.getProfileShape(app);
        const pathObject = this.getPathShape(app);

        if (!profileObject || !pathObject) {
            console.warn(`Source objects for SweepObject ${this.id} not found.`);
            const placeholderGeom = new THREE.BoxGeometry(10, 10, 10);
            const placeholderMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
            return new THREE.Mesh(placeholderGeom, placeholderMat);
        }

        let profilePoints: Point[] = [];
        if (profileObject instanceof PolylineObject) {
            profilePoints = profileObject.points;
        } else if (profileObject instanceof SketchObject) {
            profileObject.objects.forEach(obj => {
                if (obj instanceof PolylineObject) {
                    profilePoints.push(...obj.points);
                }
            });
        }
        
        let pathPoints: Point[] = [];
        if (pathObject instanceof PolylineObject) {
            pathPoints = pathObject.points;
        } else if (pathObject instanceof SketchObject) {
             pathObject.objects.forEach(obj => {
                if (obj instanceof PolylineObject) {
                    pathPoints.push(...obj.points);
                }
            });
        }
        
        if (profilePoints.length < 3 || pathPoints.length < 2) {
             const placeholderGeom = new THREE.BoxGeometry(10, 10, 10);
             const placeholderMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
             this.mesh = new THREE.Mesh(placeholderGeom, placeholderMat);
             return this.mesh;
        }

        const shape = new THREE.Shape();
        shape.moveTo(profilePoints[0].x, profilePoints[0].y);
        for (let i = 1; i < profilePoints.length; i++) {
            shape.lineTo(profilePoints[i].x, profilePoints[i].y);
        }
        shape.closePath();

        const path3D = new THREE.CatmullRomCurve3(
            pathPoints.map(p => new THREE.Vector3(p.x, p.y, 0))
        );

        const extrudeSettings = {
            steps: pathPoints.length * 4,
            extrudePath: path3D
        };

        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        const material = new THREE.MeshStandardMaterial({ color: 0x00cc7a, roughness: 0.5, metalness: 0.1 });
        this.mesh = new THREE.Mesh(geometry, material);

        return this.mesh;
    }

    // --- SceneObject Interface ---
    draw(ctx: CanvasRenderingContext2D, isSelected: boolean, zoom: number, allVisibleObjects: readonly SceneObject[], app: App): void {
        const profileObject = this.getProfileShape(app);
        const pathObject = this.getPathShape(app);
        if (profileObject) {
            profileObject.draw(ctx, isSelected, zoom, allVisibleObjects, app);
        }
        if (pathObject) {
            pathObject.draw(ctx, isSelected, zoom, allVisibleObjects, app);
        }
    }

    contains(point: Point, tolerance: number, app: App): boolean {
        const profileObject = this.getProfileShape(app);
        const pathObject = this.getPathShape(app);
        return (profileObject?.contains(point, tolerance, app) || false) || (pathObject?.contains(point, tolerance, app) || false);
    }

    getBoundingBox(app: App): BoundingBox {
        const profileObject = this.getProfileShape(app);
        return profileObject?.getBoundingBox(app) || { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }
    
    move(dx: number, dy: number, app: App): void {
        this.getProfileShape(app)?.move(dx, dy, app);
        this.getPathShape(app)?.move(dx, dy, app);
        this.mesh = null; // Invalidate mesh
    }

    rotate(angle: number, center: Point, app: App): void {
        this.getProfileShape(app)?.rotate(angle, center, app);
        this.getPathShape(app)?.rotate(angle, center, app);
        this.mesh = null;
    }

    scale(factor: number, center: Point, app: App): void {
        this.getProfileShape(app)?.scale(factor, center, app);
        this.getPathShape(app)?.scale(factor, center, app);
        this.mesh = null;
    }
    
    clone(newId: number, app: App): SceneObject {
        const newSweep = new SweepObject(newId, this.profileId, this.pathId);
        newSweep.isHidden = this.isHidden;
        return newSweep;
    }

    getCenter(app: App): Point {
        return this.getProfileShape(app)?.getCenter(app) || { x: 0, y: 0 };
    }

    getSnapPoints(app: App): Point[] {
        const profileSnaps = this.getProfileShape(app)?.getSnapPoints(app) || [];
        const pathSnaps = this.getPathShape(app)?.getSnapPoints(app) || [];
        return [...profileSnaps, ...pathSnaps];
    }

    getGrips(app: App): Grip[] { return []; }
    
    toJSON(): any {
        return {
            type: 'sweepObject',
            id: this.id,
            profileId: this.profileId,
            pathId: this.pathId,
            isHidden: this.isHidden,
        };
    }

    static fromJSON(data: any, app: App): SweepObject {
        const obj = new SweepObject(data.id, data.profileId, data.pathId);
        obj.isHidden = data.isHidden;
        return obj;
    }
}
