/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from '../app';
import { SceneObject } from '../scene/scene-object';
import { SelectionObserver } from './interfaces';

export class ModificationToolbarController implements SelectionObserver {
    private app: App;
    private trimToolButton: HTMLButtonElement;
    private extendToolButton: HTMLButtonElement;
    private offsetToolButton: HTMLButtonElement;
    private mirrorToolButton: HTMLButtonElement;
    private filletToolButton: HTMLButtonElement;
    private chamferToolButton: HTMLButtonElement;
    private extrudeToolButton: HTMLButtonElement;
    private revolveToolButton: HTMLButtonElement;
    private cutToolButton: HTMLButtonElement;
    private sweepToolButton: HTMLButtonElement;
    private loftToolButton: HTMLButtonElement;
    
    constructor(app: App) {
        this.app = app;
        
        this.trimToolButton = document.getElementById('trim-tool') as HTMLButtonElement;
        this.extendToolButton = document.getElementById('extend-tool') as HTMLButtonElement;
        this.offsetToolButton = document.getElementById('offset-tool') as HTMLButtonElement;
        this.mirrorToolButton = document.getElementById('mirror-tool') as HTMLButtonElement;
        this.filletToolButton = document.getElementById('fillet-tool') as HTMLButtonElement;
        this.chamferToolButton = document.getElementById('chamfer-tool') as HTMLButtonElement;
        this.extrudeToolButton = document.getElementById('extrude-tool') as HTMLButtonElement;
        this.revolveToolButton = document.getElementById('revolve-tool') as HTMLButtonElement;
        this.cutToolButton = document.getElementById('cut-tool') as HTMLButtonElement;
        this.sweepToolButton = document.getElementById('sweep-tool') as HTMLButtonElement;
        this.loftToolButton = document.getElementById('loft-tool') as HTMLButtonElement;
        
        this.initListeners();
        this.onSelectionChanged([]);
    }
    
    private initListeners(): void {
        this.trimToolButton.addEventListener('click', () => this.app.startCommand('TRIM'));
        this.extendToolButton.addEventListener('click', () => this.app.startCommand('EXTEND'));
        this.offsetToolButton.addEventListener('click', () => this.app.startCommand('OFFSET'));
        this.mirrorToolButton.addEventListener('click', () => this.app.startCommand('MIRROR'));
        this.filletToolButton.addEventListener('click', () => this.app.startCommand('FILLET'));
        this.chamferToolButton.addEventListener('click', () => this.app.startCommand('CHAMFER'));
        this.extrudeToolButton.addEventListener('click', () => this.app.startCommand('EXTRUDE'));
        this.revolveToolButton.addEventListener('click', () => this.app.startCommand('REVOLVE'));
        this.cutToolButton.addEventListener('click', () => this.app.startCommand('CUT'));
        this.sweepToolButton.addEventListener('click', () => this.app.startCommand('SWEEP'));
        this.loftToolButton.addEventListener('click', () => this.app.startCommand('LOFT'));
    }

    onSelectionChanged(selectedObjects: SceneObject[]): void {
        const selectedCount = selectedObjects.length;
        
        this.trimToolButton.disabled = selectedCount === 0;
        this.extendToolButton.disabled = selectedCount === 0;
        this.mirrorToolButton.disabled = selectedCount === 0;
        
        this.filletToolButton.disabled = false;
        this.chamferToolButton.disabled = false;
        
        this.extrudeToolButton.disabled = selectedCount !== 1;
        this.revolveToolButton.disabled = selectedCount !== 1;
        this.cutToolButton.disabled = false;
        this.sweepToolButton.disabled = selectedCount > 1;
        this.loftToolButton.disabled = false;
    }
}
