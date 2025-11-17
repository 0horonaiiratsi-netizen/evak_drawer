/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from '../app';
import { HistoryManager } from '../history-manager';
import { BlockDefinition } from '../scene/block-definition';
import { objectFactory } from '../scene/factory';
import { SceneObject } from '../scene/scene-object';
import { Layer } from '../layer';
import { HistoryObserver } from '../controllers/interfaces';

export class ProjectStateService {
    private app: App;
    private historyManager: HistoryManager;
    private clipboard: string | null = null;
    public blockDefinitions: Map<string, BlockDefinition> = new Map();
    private observers: HistoryObserver[] = [];

    constructor(app: App) {
        this.app = app;
        this.historyManager = new HistoryManager(this.serialize.bind(this), this.load.bind(this));
    }

    public subscribe(observer: HistoryObserver): void {
        if (!this.observers.includes(observer)) {
            this.observers.push(observer);
        }
    }

    private notifyHistoryChange(): void {
        this.observers.forEach(observer => observer.onHistoryChanged());
    }

    public commit(action: string): void {
        this.historyManager.addState(action);
        this.notifyHistoryChange();
    }

    public undo(): void {
        this.historyManager.undo();
        this.notifyHistoryChange();
    }

    public redo(): void {
        this.historyManager.redo();
        this.notifyHistoryChange();
    }

    public canUndo(): boolean { return this.historyManager.canUndo(); }
    public canRedo(): boolean { return this.historyManager.canRedo(); }

    public clearHistory(): void {
        this.historyManager.clear();
    }

    public copySelection(): void {
        const objects = this.app.groupEditContext ? this.app.groupEditContext.objects : this.app.sceneService.objects;
        const selectedObjects = objects.filter(obj => this.app.selectionService.selectedIds.includes(obj.id));
        if (selectedObjects.length > 0) {
            const clipboardData = selectedObjects.map(obj => obj.toJSON());
            this.clipboard = JSON.stringify(clipboardData);
        }
    }

    public pasteFromClipboard(): void {
        if (!this.clipboard) return;
        try {
            const clipboardData = JSON.parse(this.clipboard);
            const newIds: number[] = [];
            clipboardData.forEach((objData: any) => {
                const factory = objectFactory[objData.type as keyof typeof objectFactory];
                if (factory) {
                    objData.id = this.app.sceneService.getNextId();
                    const newObject = factory(objData, this.app);
                    newObject.move(20, 20, this.app);
                    this.app.addSceneObject(newObject, false);
                    newIds.push(newObject.id);
                }
            });
            if (newIds.length > 0) {
                this.commit(`Paste ${newIds.length} object(s)`);
                this.app.selectionService.set(newIds);
            }
        } catch (e) {
            console.error("Failed to paste from clipboard", e);
            this.clipboard = null;
        }
    }

    public serialize(): string {
        const sceneData = {
            sceneObjects: this.app.sceneService.objects.map(obj => obj.toJSON()),
            layers: this.app.layerService.layers.map(l => l.toJSON()),
            styles: this.app.styleManager.toJSON(),
            blockDefinitions: Array.from(this.blockDefinitions.values()).map(def => def.toJSON()),
            nextObjectId: this.app.sceneService.getNextId(),
            nextLayerId: this.app.layerService.getNextId(),
            activeLayerId: this.app.layerService.activeLayerId,
        };
        return JSON.stringify(sceneData, null, 2);
    }
    
    public load(jsonString: string): void {
        try {
            const data = JSON.parse(jsonString);

            if (data.styles) {
                this.app.styleManager.fromJSON(data.styles);
            } else {
                this.app.styleManager = new (this.app.styleManager.constructor as any)();
            }

            this.blockDefinitions.clear();
            if (data.blockDefinitions) {
                data.blockDefinitions.forEach((defData: any) => {
                    const def = BlockDefinition.fromJSON(defData, this.app);
                    this.blockDefinitions.set(def.name, def);
                });
            }

            const isOldFormat = Array.isArray(data);
            const parsedObjects = isOldFormat ? data : data.sceneObjects;
            if (!Array.isArray(parsedObjects)) throw new Error("Invalid project file: `sceneObjects` is not an array.");
            
            const newSceneObjects: SceneObject[] = [];
            let maxId = 0;
            for (const objData of parsedObjects) {
                if (typeof objData.type !== 'string') continue;
                const factory = objectFactory[objData.type as keyof typeof objectFactory];
                if (factory) {
                    newSceneObjects.push(factory(objData, this.app));
                    if (objData.id > maxId) maxId = objData.id;
                }
            }
            this.app.sceneService.replaceAll(newSceneObjects);
            
            this.app.layerService.clear();
            if (isOldFormat || !data.layers) {
                const defaultLayer = this.app.layerService.addLayer('Основний шар', false);
                defaultLayer.objectIds = this.app.sceneService.objects.map(obj => obj.id);
                this.app.layerService.setActiveId(defaultLayer.id);
                this.app.sceneService.setNextId(maxId + 1);
            } else {
                this.app.layerService.replaceAll(data.layers.map((layerData: any) => Layer.fromJSON(layerData)));
                this.app.sceneService.setNextId(data.nextObjectId || maxId + 1);
                this.app.layerService.setNextId(data.nextLayerId || Math.max(...this.app.layerService.layers.map(l => l.id)) + 1);
                this.app.layerService.setActiveId(data.activeLayerId || this.app.layerService.layers[0]?.id);
            }
            
            this.app.groupEditContext = null;
            this.app.layersController.render();
            this.app.styleManagerController.render();
            this.app.dimensionStyleManagerController.render();
            this.app.selectionService.set([]);
            this.app.draw();
        } catch (error) {
            console.error("Failed to load state:", error);
            this.app.dialogController.alert("Помилка завантаження", "Не вдалося завантажити стан. Файл може бути пошкодженим або мати невірний формат.");
        }
    }
}