/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from '../app';
import { SelectionObserver } from '../controllers/interfaces';
import { SceneObject } from '../scene/scene-object';

export class SelectionService {
    private app: App;
    private _selectedObjectIds: number[] = [];
    private observers: SelectionObserver[] = [];

    constructor(app: App) {
        this.app = app;
    }

    public get selectedIds(): readonly number[] {
        return this._selectedObjectIds;
    }

    public set(ids: number[]): void {
        const sortedIds = [...ids].sort();
        const sortedCurrentIds = [...this._selectedObjectIds].sort();

        // Avoid unnecessary updates if the selection hasn't actually changed.
        if (sortedIds.length === sortedCurrentIds.length && sortedIds.every((id, index) => id === sortedCurrentIds[index])) {
            return;
        }

        this._selectedObjectIds = ids;
        this.notify();
    }

    public setSingle(id: number | null): void {
        this.set(id === null ? [] : [id]);
    }

    public subscribe(observer: SelectionObserver): void {
        if (!this.observers.includes(observer)) {
            this.observers.push(observer);
        }
    }

    public unsubscribe(observer: SelectionObserver): void {
        const index = this.observers.indexOf(observer);
        if (index > -1) {
            this.observers.splice(index, 1);
        }
    }

    private notify(): void {
        const objects = this.app.groupEditContext ? this.app.groupEditContext.objects : this.app.sceneService.objects;
        const selectedObjects = objects.filter(obj => this._selectedObjectIds.includes(obj.id));

        this.observers.forEach(observer => {
            try {
                observer.onSelectionChanged(selectedObjects);
            } catch (e) {
                console.error("Error in selection observer:", e);
            }
        });
        
        this.app.draw();
    }
}
