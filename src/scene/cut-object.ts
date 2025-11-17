/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { App } from '../app';
import { BoundingBox, SceneObject } from './scene-object';
import { Point } from './point';
import { Grip } from '../grips';
import { ExtrudeObject } from './extrude-object';
import { RevolveObject } from './revolve-object';

declare const THREE: any;
declare const CSG: any;

/**
 * Represents the result of a boolean subtraction (CSG Cut) operation.
 * It is non-destructive; it references the original target and tool objects.
 */
export class CutObject implements SceneObject {
    id: number;
    targetId: number;
    toolId: number;
    // FIX: Add isHidden property to conform to SceneObject and allow hiding.
    isHidden?: boolean;
    private mesh: any | null = null; // THREE.Mesh

    constructor(id: number, targetId: number, toolId: number) {
        this.id = id;
        this.targetId = targetId;
        this.toolId = toolId;
    }

    private getTargetObject(app: App): SceneObject | undefined {
        // FIX: Use sceneService to access objects.
        return app.sceneService.findById(this.targetId);
    }

    private getToolObject(app: App): SceneObject | undefined {
        // FIX: Use sceneService to access objects.
        return app.sceneService.findById(this.toolId);
    }

    getOrCreateMesh(app: App): any { // THREE.Mesh
        if (this.mesh) {
            return this.mesh;
        }

        const targetObj = this.getTargetObject(app) as ExtrudeObject | RevolveObject | CutObject | undefined;
        const toolObj = this.getToolObject(app) as ExtrudeObject | RevolveObject | CutObject | undefined;

        if (!targetObj || !toolObj) {
            console.error(`CutObject ${this.id}: Could not find source objects.`);
            return null;
        }

        const targetMesh = targetObj.getOrCreateMesh(app);
        const toolMesh = toolObj.getOrCreateMesh(app);

        if (!targetMesh || !toolMesh) {
            console.error(`CutObject ${this.id}: Could not create meshes from source objects.`);
            return null;
        }
        
        targetMesh.updateMatrixWorld();
        toolMesh.updateMatrixWorld();
        
        // This assumes a version of csg.js compatible with THREE.BufferGeometry,
        // which might require a modern fork. The core logic stands.
        const targetCSG = CSG.fromGeometry(targetMesh.geometry.clone().applyMatrix4(targetMesh.matrixWorld));
        const toolCSG = CSG.fromGeometry(toolMesh.geometry.clone().applyMatrix4(toolMesh.matrixWorld));

        const resultCSG = targetCSG.subtract(toolCSG);

        const resultGeometry = resultCSG.toGeometry();
        
        const material = new THREE.MeshStandardMaterial({ color: 0x007acc, side: THREE.DoubleSide });
        this.mesh = new THREE.Mesh(resultGeometry, material);
        
        this.mesh.position.set(0, 0, 0);
        this.mesh.rotation.set(0, 0, 0);
        this.mesh.scale.set(1, 1, 1);
        
        return this.mesh;
    }

    // --- SceneObject Interface ---

    draw(ctx: CanvasRenderingContext2D, isSelected: boolean, zoom: number, allVisibleObjects: readonly SceneObject[], app: App): void {
        const targetObject = this.getTargetObject(app);
        if (targetObject) {
            // In 2D, a cut object looks just like its target object, but selected.
            targetObject.draw(ctx, isSelected, zoom, allVisibleObjects, app);
        }
    }

    contains(point: Point, tolerance: number, app: App): boolean {
        const targetObject = this.getTargetObject(app);
        return targetObject?.contains(point, tolerance, app) || false;
    }

    getBoundingBox(app: App): BoundingBox {
        const targetObject = this.getTargetObject(app);
        return targetObject?.getBoundingBox(app) || { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }
    
    move(dx: number, dy: number, app: App): void {
        this.getTargetObject(app)?.move(dx, dy, app);
        this.getToolObject(app)?.move(dx, dy, app);
        this.mesh = null; // Invalidate mesh
    }

    rotate(angle: number, center: Point, app: App): void {
        this.getTargetObject(app)?.rotate(angle, center, app);
        this.getToolObject(app)?.rotate(angle, center, app);
        this.mesh = null;
    }

    scale(factor: number, center: Point, app: App): void {
        this.getTargetObject(app)?.scale(factor, center, app);
        this.getToolObject(app)?.scale(factor, center, app);
        this.mesh = null;
    }
    
    clone(newId: number, app: App): SceneObject {
        const newCut = new CutObject(newId, this.targetId, this.toolId);
        newCut.isHidden = this.isHidden;
        return newCut;
    }

    getCenter(app: App): Point {
        return this.getTargetObject(app)?.getCenter(app) || { x: 0, y: 0 };
    }

    getSnapPoints(app: App): Point[] {
        return this.getTargetObject(app)?.getSnapPoints(app) || [];
    }

    getGrips(app: App): Grip[] {
        // Grips on a cut object are complex, so we offer none for now.
        return [];
    }
    
    toJSON(): any {
        return {
            type: 'cutObject',
            id: this.id,
            targetId: this.targetId,
            toolId: this.toolId,
            isHidden: this.isHidden,
        };
    }

    static fromJSON(data: any, app: App): CutObject {
        const obj = new CutObject(data.id, data.targetId, data.toolId);
        obj.isHidden = data.isHidden;
        return obj;
    }
}
