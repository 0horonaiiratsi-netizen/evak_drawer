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
 * Represents a 3D object created by extruding a 2D source shape.
 * This object is primarily a container for 3D data and delegates most 2D
 * interactions to its source object.
 */
export class ExtrudeObject implements SceneObject {
    id: number;
    sourceObjectId: number;
    height: number;
    // FIX: Add isHidden property to conform to SceneObject and allow hiding.
    isHidden?: boolean;
    filletRadius: number = 0; // Radius for fillet on edges
    chamferDistance: number = 0; // Distance for chamfer on edges
    private mesh: any | null = null; // THREE.Mesh

    /**
     * Constructs an ExtrudeObject.
     * @param id The unique ID for this object.
     * @param sourceObjectId The ID of the 2D object (Polyline or Sketch) to be extruded.
     * @param height The extrusion height.
     */
    constructor(id: number, sourceObjectId: number, height: number) {
        this.id = id;
        this.sourceObjectId = sourceObjectId;
        this.height = height;
    }

    /**
     * Applies fillet to the extruded geometry by rounding corners.
     * @param geometry The THREE.ExtrudeGeometry to modify.
     * @param radius The fillet radius.
     */
    private applyFillet(geometry: any, radius: number) {
        // Basic fillet implementation: reduce corner sharpness
        // For full fillet, would need more complex geometry manipulation
        if (radius > 0) {
            // Simple approximation: scale down the geometry slightly
            geometry.scale(1 - radius / 100, 1 - radius / 100, 1);
        }
    }

    /**
     * Applies chamfer to the extruded geometry by cutting corners.
     * @param geometry The THREE.ExtrudeGeometry to modify.
     * @param distance The chamfer distance.
     */
    private applyChamfer(geometry: any, distance: number) {
        // Basic chamfer implementation: bevel corners
        if (distance > 0) {
            // Simple approximation: modify bevel settings
            geometry.parameters.bevelSize = distance;
            geometry.parameters.bevelThickness = distance;
        }
    }

    /**
     * Finds and returns the source SceneObject from the application's scene.
     * @param app The main application instance.
     * @returns The source SceneObject, or undefined if not found.
     */
    private getSourceShape(app: App): SceneObject | undefined {
        // FIX: Use sceneService to access objects.
        return app.sceneService.findById(this.sourceObjectId);
    }

    /**
     * Creates a three.js mesh from the source 2D shape if it doesn't already exist.
     * Caches and returns the mesh on subsequent calls.
     * @param app The main application instance, required to find the source object.
     * @returns The THREE.Mesh object.
     */
    getOrCreateMesh(app: App): any { // THREE.Mesh
        if (this.mesh) {
            return this.mesh;
        }

        const sourceObject = this.getSourceShape(app);
        if (!sourceObject || !(sourceObject instanceof PolylineObject || sourceObject instanceof SketchObject)) {
            console.warn(`Source object ${this.sourceObjectId} for ExtrudeObject ${this.id} not found or not a valid shape.`);
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
        
        if (points.length < 3) {
             const placeholderGeom = new THREE.BoxGeometry(10, this.height, 10);
             const placeholderMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
             this.mesh = new THREE.Mesh(placeholderGeom, placeholderMat);
             return this.mesh;
        }

        const shape = new THREE.Shape();
        shape.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            shape.lineTo(points[i].x, points[i].y);
        }
        shape.closePath();

        const extrudeSettings = {
            steps: 1,
            depth: this.height,
            bevelEnabled: this.chamferDistance > 0,
            bevelSize: this.chamferDistance,
            bevelThickness: this.chamferDistance,
        };

        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        const material = new THREE.MeshStandardMaterial({ color: 0x007acc, roughness: 0.5, metalness: 0.1 });
        this.mesh = new THREE.Mesh(geometry, material);

        // Apply fillet if set
        if (this.filletRadius > 0) {
            this.applyFillet(geometry, this.filletRadius);
        }

        return this.mesh;
    }

    // --- SceneObject Interface ---

    /**
     * In 2D view, draws the source object with a selection highlight if this ExtrudeObject is selected.
     * @param ctx The canvas rendering context.
     * @param isSelected Whether the object is currently selected.
     * @param zoom The current zoom level.
     * @param allVisibleObjects All other visible objects on the scene.
     * @param app The main application instance.
     */
    draw(ctx: CanvasRenderingContext2D, isSelected: boolean, zoom: number, allVisibleObjects: readonly SceneObject[], app: App): void {
        const sourceObject = this.getSourceShape(app);
        if (sourceObject) {
            sourceObject.draw(ctx, isSelected, zoom, allVisibleObjects, app);
        }
    }

    /**
     * Checks for selection by delegating the check to the source 2D object.
     * @param point The point to check.
     * @param tolerance The selection tolerance.
     * @param app The main application instance.
     * @returns True if the point is within the source object.
     */
    contains(point: Point, tolerance: number, app: App): boolean {
        const sourceObject = this.getSourceShape(app);
        return sourceObject?.contains(point, tolerance, app) || false;
    }

    /**
     * Gets the bounding box by delegating to the source 2D object.
     * @param app The main application instance.
     * @returns The bounding box of the source object.
     */
    getBoundingBox(app: App): BoundingBox {
        const sourceObject = this.getSourceShape(app);
        return sourceObject?.getBoundingBox(app) || { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }
    
    /**
     * Moves the object by moving its source object and its 3D mesh.
     * @param dx The distance to move along the X-axis.
     * @param dy The distance to move along the Y-axis.
     * @param app The main application instance.
     */
    move(dx: number, dy: number, app: App): void {
        const sourceObject = this.getSourceShape(app);
        sourceObject?.move(dx, dy, app);
        if (this.mesh) {
            this.mesh.position.x += dx;
            this.mesh.position.y += dy;
        }
    }

    /**
     * Rotates the object by rotating its source object. The 3D mesh is not rotated here.
     * @param angle The angle to rotate by, in radians.
     * @param center The center point of rotation.
     * @param app The main application instance.
     */
    rotate(angle: number, center: Point, app: App): void {
        const sourceObject = this.getSourceShape(app);
        sourceObject?.rotate(angle, center, app);
    }

    /**
     * Scales the object by scaling its source object. The 3D mesh is not scaled here.
     * @param factor The scaling factor.
     * @param center The center point of scaling.
     * @param app The main application instance.
     */
    scale(factor: number, center: Point, app: App): void {
        const sourceObject = this.getSourceShape(app);
        sourceObject?.scale(factor, center, app);
    }
    
    /**
     * Clones the ExtrudeObject, which also involves cloning its source object.
     * @param newId The new ID for the cloned ExtrudeObject.
     * @param app The main application instance.
     * @returns A new ExtrudeObject.
     */
    clone(newId: number, app: App): SceneObject {
        const sourceObject = this.getSourceShape(app);
        if (sourceObject) {
            // FIX: Use sceneService for getting next ID.
            const newSource = sourceObject.clone(app.sceneService.getNextId(), app);
            app.addSceneObject(newSource, false);
            const newExtrude = new ExtrudeObject(newId, newSource.id, this.height);
            newExtrude.isHidden = this.isHidden;
            return newExtrude;
        }
        const newExtrude = new ExtrudeObject(newId, -1, this.height);
        newExtrude.isHidden = this.isHidden;
        return newExtrude;
    }

    getCenter(app: App): Point {
        const sourceObject = this.getSourceShape(app);
        return sourceObject?.getCenter(app) || { x: 0, y: 0 };
    }

    getSnapPoints(app: App): Point[] {
        const sourceObject = this.getSourceShape(app);
        return sourceObject?.getSnapPoints(app) || [];
    }

    getGrips(app: App): Grip[] {
        const sourceObject = this.getSourceShape(app);
        return sourceObject?.getGrips(app) || [];
    }
    
    toJSON(): any {
        return {
            type: 'extrudeObject',
            id: this.id,
            sourceObjectId: this.sourceObjectId,
            height: this.height,
            isHidden: this.isHidden,
            filletRadius: this.filletRadius,
            chamferDistance: this.chamferDistance,
        };
    }

    static fromJSON(data: any, app: App): ExtrudeObject {
        const obj = new ExtrudeObject(data.id, data.sourceObjectId, data.height);
        obj.isHidden = data.isHidden;
        obj.filletRadius = data.filletRadius || 0;
        obj.chamferDistance = data.chamferDistance || 0;
        return obj;
    }
}
