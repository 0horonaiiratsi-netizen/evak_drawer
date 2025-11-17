/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from '../app';
import { I18nService } from '../i18n';
import { Layer } from '../layer';
import { SceneObject } from '../scene/scene-object';
import { Wall, Door, BuildingWindow, StairsObject, SymbolObject, TextObject, GroupObject, PolylineObject, CircleObject, ArcObject, HatchObject, DimensionObject, EvacuationPath, EmergencyEvacuationPath, PdfUnderlay, SketchObject, BlockReference, ExtrudeObject, RevolveObject, CutObject, SweepObject, LoftObject } from '../scene/scene-object-imports';
import { DialogController } from '../dialog-controller';

export class LayerService {
    private app: App;
    private i18n: I18nService;
    private dialogController: DialogController;
    private _layers: Layer[] = [];
    private _activeLayerId: number = 0;
    private nextLayerId: number = 1;

    constructor(app: App) {
        this.app = app;
        this.i18n = app.i18n;
        this.dialogController = app.dialogController;
    }
    
    public get layers(): readonly Layer[] {
        return this._layers;
    }
    
    public get activeLayerId(): number {
        return this._activeLayerId;
    }

    public getNextId(): number {
        return this.nextLayerId++;
    }

    public setNextId(id: number): void {
        this.nextLayerId = id;
    }

    public clear(): void {
        this._layers = [];
        this.nextLayerId = 1;
        this._activeLayerId = 0;
    }
    
    public replaceAll(layers: Layer[]): void {
        this._layers = layers;
    }
    
    public setActiveId(id: number): void {
        this._activeLayerId = id;
    }

    public addLayer(name: string, recordHistory: boolean = true): Layer {
        const newLayer = new Layer(this.getNextId(), name);
        this._layers.unshift(newLayer);
        this.setActiveLayerId(newLayer.id, recordHistory);
        return newLayer;
    }
    
    public async promptAndAddLayer(): Promise<void> {
        const defaultName = this.i18n.t('dialog.newLayer.defaultName', this.nextLayerId);
        const finalName = await this.dialogController.prompt(
            this.i18n.t('dialog.newLayer.title'),
            this.i18n.t('dialog.newLayer.message'),
            defaultName
        );
        if (finalName && finalName.trim()) {
            this.addLayer(finalName.trim());
            this.app.layersController.render();
        }
    }

    public async deleteLayer(id: number, recordHistory: boolean = true): Promise<void> {
        if (this._layers.length <= 1) {
            await this.dialogController.alert(this.i18n.t('dialog.error'), this.i18n.t('dialog.cantDeleteLastLayer'));
            return;
        }
        const layerIndex = this._layers.findIndex(l => l.id === id);
        if (layerIndex > -1) {
            const layerToDelete = this._layers[layerIndex];
            if (layerToDelete.objectIds.length > 0) {
                const result = await this.dialogController.prompt(
                    this.i18n.t('dialog.confirmLayerDelete.title'),
                    this.i18n.t('dialog.confirmLayerDelete.message', layerToDelete.name),
                    ''
                );
                if (result?.toLowerCase() !== this.i18n.t('dialog.confirmLayerDelete.confirmWord')) return;
            }
            
            layerToDelete.objectIds.forEach(objId => this.app.sceneService.removeById(objId));
            this._layers.splice(layerIndex, 1);
            
            if (this.activeLayerId === id) {
                this.setActiveLayerId(this._layers[0].id, false);
            }
            if (recordHistory) {
                this.app.projectStateService.commit(`Delete layer "${layerToDelete.name}"`);
            }
            this.app.layersController.render();
            this.app.draw();
        }
    }

    public setActiveLayerId(id: number, recordHistory: boolean = true): void {
        if (this._layers.some(l => l.id === id) && this.activeLayerId !== id) {
            this._activeLayerId = id;
            if (recordHistory) {
                this.app.projectStateService.commit(`Set active layer to ID ${id}`);
            }
            this.app.layersController.render();
        }
    }

    public renameLayer(id: number, newName: string, recordHistory: boolean = true): void {
        const layer = this._layers.find(l => l.id === id);
        if (layer && newName.trim() && layer.name !== newName.trim()) {
            layer.name = newName.trim();
            if (recordHistory) {
                this.app.projectStateService.commit(`Rename layer ID ${id}`);
            }
            this.app.layersController.render();
        }
    }

    public toggleLayerVisibility(id: number, recordHistory: boolean = true): void {
        const layer = this._layers.find(l => l.id === id);
        if (layer) {
            layer.isVisible = !layer.isVisible;
            if (recordHistory) {
                this.app.projectStateService.commit(`Toggle visibility for layer ID ${id}`);
            }
            this.app.layersController.render();
            this.app.draw();
        }
    }

    public toggleLayerLock(id: number, recordHistory: boolean = true): void {
        const layer = this._layers.find(l => l.id === id);
        if (layer) {
            layer.isLocked = !layer.isLocked;
            if (layer.isLocked) {
                const idsOnThisLayer = new Set(layer.objectIds);
                const newSelection = this.app.selectionService.selectedIds.filter(id => !idsOnThisLayer.has(id));
                this.app.selectionService.set(newSelection);
            }
            if (recordHistory) {
                this.app.projectStateService.commit(`Toggle lock for layer ID ${id}`);
            }
            this.app.layersController.render();
            this.app.draw();
        }
    }

    public getLayerForObject(objectId: number): Layer | undefined {
        return this._layers.find(layer => layer.objectIds.includes(objectId));
    }

    public getLayer(name: string): Layer | undefined {
        return this._layers.find(layer => layer.name === name);
    }

    public get defaultLayer(): Layer {
        return this._layers[0] || new Layer(0, '0');
    }
    
    public moveActiveLayerForward(recordHistory: boolean = true): void {
        const index = this._layers.findIndex(l => l.id === this.activeLayerId);
        if (index > 0) {
            [this._layers[index], this._layers[index - 1]] = [this._layers[index - 1], this._layers[index]];
            if (recordHistory) { this.app.projectStateService.commit("Move layer forward"); }
            this.app.layersController.render();
            this.app.draw();
        }
    }

    public moveActiveLayerBackward(recordHistory: boolean = true): void {
        const index = this._layers.findIndex(l => l.id === this.activeLayerId);
        if (index < this._layers.length - 1) {
            [this._layers[index], this._layers[index + 1]] = [this._layers[index + 1], this._layers[index]];
            if (recordHistory) { this.app.projectStateService.commit("Move layer backward"); }
            this.app.layersController.render();
            this.app.draw();
        }
    }
    
    public getLayerNameForObject(obj: SceneObject): string | null {
        if (obj instanceof Wall || obj instanceof Door || obj instanceof BuildingWindow || obj instanceof StairsObject) return this.i18n.t('layer.walls');
        if (obj instanceof SymbolObject || obj instanceof TextObject || obj instanceof GroupObject || obj instanceof PolylineObject || obj instanceof CircleObject || obj instanceof ArcObject || obj instanceof HatchObject || obj instanceof DimensionObject || obj instanceof SketchObject || obj instanceof BlockReference || obj instanceof ExtrudeObject || obj instanceof RevolveObject || obj instanceof CutObject || obj instanceof SweepObject || obj instanceof LoftObject) return this.i18n.t('layer.symbols');
        if (obj instanceof EvacuationPath || obj instanceof EmergencyEvacuationPath) return this.i18n.t('layer.paths');
        if (obj instanceof PdfUnderlay) return this.i18n.t('layer.underlay');
        return null;
    }

    public removeObjectFromLayers(objectId: number): void {
        for (const layer of this._layers) {
            const objIndexInLayer = layer.objectIds.indexOf(objectId);
            if (objIndexInLayer > -1) {
                layer.objectIds.splice(objIndexInLayer, 1);
                break;
            }
        }
    }
}
