/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from '../app';
import { BoundingBox, SceneObject } from '../scene/scene-object';
import { GroupObject } from '../scene/group-object';
import { HatchObject } from '../scene/hatch-object';
import { PdfUnderlay } from '../scene/pdf-underlay';
import { Wall } from '../scene/wall';
import { CutObject } from '../scene/cut-object';
import { SweepObject } from '../scene/sweep-object';
import { LoftObject } from '../scene/loft-object';

export class SceneService {
    private app: App;
    private sceneObjects: SceneObject[] = [];
    private nextObjectId: number = 1;

    constructor(app: App) {
        this.app = app;
    }

    public get objects(): readonly SceneObject[] {
        return this.sceneObjects;
    }

    public getNextId(): number {
        return this.nextObjectId++;
    }

    public setNextId(id: number): void {
        this.nextObjectId = id;
    }

    public add(obj: SceneObject): void {
        this.sceneObjects.push(obj);
    }
    
    public removeById(id: number): boolean {
        const index = this.sceneObjects.findIndex(obj => obj.id === id);
        if (index > -1) {
            const objToRemove = this.sceneObjects[index];
            this.sceneObjects.splice(index, 1);

            if (objToRemove instanceof GroupObject) {
                objToRemove.getAllChildren().forEach(child => this.removeById(child.id));
            }
            return true;
        }
        return false;
    }

    public findById(id: number): SceneObject | undefined {
        return this.sceneObjects.find(obj => obj.id === id);
    }
    
    public clear(): void {
        this.sceneObjects = [];
        this.nextObjectId = 1;
    }
    
    public replaceAll(objects: SceneObject[]): void {
        this.sceneObjects = objects;
    }
    
    public deleteSelected(): void {
        if (this.app.selectionService.selectedIds.length === 0) return;
        
        let deletedCount = 0;
        const idsToDelete = [...this.app.selectionService.selectedIds];

        for (const id of idsToDelete) {
            if (this.app.groupEditContext) {
                this.app.groupEditContext.remove(id);
                deletedCount++;
                continue;
            }

            const objectToDelete = this.findById(id);
            if (objectToDelete instanceof CutObject) {
                const target = this.findById(objectToDelete.targetId);
                const tool = this.findById(objectToDelete.toolId);
                if (target) target.isHidden = false;
                if (tool) tool.isHidden = false;
            }
             if (objectToDelete instanceof SweepObject) {
                const profile = this.findById(objectToDelete.profileId);
                const path = this.findById(objectToDelete.pathId);
                if (profile) profile.isHidden = false;
                if (path) path.isHidden = false;
            }
             if (objectToDelete instanceof LoftObject) {
                objectToDelete.sourceObjectIds.forEach(sourceId => {
                    const sourceObj = this.findById(sourceId);
                    if (sourceObj) sourceObj.isHidden = false;
                });
            }

            const layer = this.app.layerService.getLayerForObject(id);
            if (layer?.isLocked) continue;

            if (this.removeById(id)) {
                this.app.layerService.removeObjectFromLayers(id);
                deletedCount++;
            }
        }
        
        if (deletedCount > 0) {
            this.app.projectStateService.commit(`Delete ${deletedCount} object(s)`);
        }
        this.app.selectionService.set([]);
    }

    public getVisibleObjectsSortedForRender(): SceneObject[] {
        const objectMap = new Map(this.sceneObjects.map(obj => [obj.id, obj]));
        const visibleObjects: SceneObject[] = [];

        for (const layer of [...this.app.layerService.layers].reverse()) {
            if (layer.isVisible) {
                const layerObjects = layer.objectIds
                    .map(id => objectMap.get(id))
                    .filter((obj): obj is SceneObject => !!obj && !obj.isHidden);
                
                const sortedLayerObjects = layerObjects.sort((a, b) => {
                    if (a instanceof PdfUnderlay) return -1;
                    if (b instanceof PdfUnderlay) return 1;
                    if (a instanceof HatchObject) return -1;
                    if (b instanceof HatchObject) return 1;
                    if (a instanceof Wall) return -1;
                    if (b instanceof Wall) return 1;
                    return 0;
                });
                visibleObjects.push(...sortedLayerObjects);
            }
        }
        return visibleObjects;
    }
    
    public getVisibleObjectsBoundingBox(): BoundingBox | null {
        const visibleObjects = this.getVisibleObjectsSortedForRender();
        if (visibleObjects.length === 0) return null;
        
        const bboxes = visibleObjects.map(obj => obj.getBoundingBox(this.app));
        return {
            minX: Math.min(...bboxes.map(b => b.minX)), minY: Math.min(...bboxes.map(b => b.minY)),
            maxX: Math.max(...bboxes.map(b => b.maxX)), maxY: Math.max(...bboxes.map(b => b.maxY)),
        };
    }
}
