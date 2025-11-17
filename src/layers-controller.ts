/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from './app';

export class LayersController {
    private app: App;
    private panel: HTMLElement;
    private listElement: HTMLElement;
    private addButton: HTMLButtonElement;
    private deleteButton: HTMLButtonElement;
    private moveUpButton: HTMLButtonElement;
    private moveDownButton: HTMLButtonElement;

    constructor(app: App) {
        this.app = app;
        this.panel = document.getElementById('layers-panel')!;
        this.listElement = document.getElementById('layers-list')!;
        this.addButton = document.getElementById('add-layer-button') as HTMLButtonElement;
        this.deleteButton = document.getElementById('delete-layer-button') as HTMLButtonElement;
        this.moveUpButton = document.getElementById('move-layer-up-button') as HTMLButtonElement;
        this.moveDownButton = document.getElementById('move-layer-down-button') as HTMLButtonElement;

        this.initListeners();
        this.render();
    }

    private initListeners(): void {
        this.addButton.addEventListener('click', () => {
            this.app.layerService.promptAndAddLayer();
        });

        this.deleteButton.addEventListener('click', () => {
            this.app.layerService.deleteLayer(this.app.layerService.activeLayerId);
        });

        this.moveUpButton.addEventListener('click', () => {
            this.app.layerService.moveActiveLayerForward();
        });

        this.moveDownButton.addEventListener('click', () => {
            this.app.layerService.moveActiveLayerBackward();
        });

        // Event delegation for clicks on the layer list
        this.listElement.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const layerItem = target.closest<HTMLElement>('.layer-item');
            if (!layerItem) return;

            const layerId = parseInt(layerItem.dataset.layerId!, 10);
            
            const visibilityToggle = target.closest('.visibility-toggle');
            const lockToggle = target.closest('.lock-toggle');

            if (visibilityToggle) {
                this.app.layerService.toggleLayerVisibility(layerId);
            } else if (lockToggle) {
                this.app.layerService.toggleLayerLock(layerId);
            } else {
                this.app.layerService.setActiveLayerId(layerId);
            }
        });
        
        // Event delegation for double clicks (renaming)
        this.listElement.addEventListener('dblclick', (e) => {
            const target = e.target as HTMLElement;
            const layerNameSpan = target.closest<HTMLElement>('.layer-name');
            const layerItem = target.closest<HTMLElement>('.layer-item');
            if (!layerNameSpan || !layerItem) return;

            const layerId = parseInt(layerItem.dataset.layerId!, 10);
            this.startRenaming(layerNameSpan, layerId);
        });
    }

    private startRenaming(spanElement: HTMLElement, layerId: number): void {
        const currentName = spanElement.textContent || '';
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentName;
        input.className = 'layer-name-input';
        
        spanElement.replaceWith(input);
        input.focus();
        input.select();
        
        const finishEditing = () => {
            const newName = input.value;
            // The renameLayer method in App will handle history recording
            this.app.layerService.renameLayer(layerId, newName);
            // The render call in renameLayer will redraw the span
            input.removeEventListener('blur', finishEditing);
            input.removeEventListener('keydown', onKeyDown);
        };
        
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                finishEditing();
            } else if (e.key === 'Escape') {
                input.value = currentName; // Revert
                finishEditing();
            }
        };

        input.addEventListener('blur', finishEditing);
        input.addEventListener('keydown', onKeyDown);
    }
    
    private updateControlButtonsState(): void {
        const activeLayerIndex = this.app.layerService.layers.findIndex(l => l.id === this.app.layerService.activeLayerId);
        const totalLayers = this.app.layerService.layers.length;

        // Disable delete if it's the last layer
        this.deleteButton.disabled = totalLayers <= 1;

        // Disable move up if it's the top-most layer (index 0)
        this.moveUpButton.disabled = activeLayerIndex === 0;

        // Disable move down if it's the bottom-most layer
        this.moveDownButton.disabled = activeLayerIndex === totalLayers - 1;
    }


    public render(): void {
        this.listElement.innerHTML = ''; // Clear existing list

        // The layers are stored with index 0 being the top-most. We render them in that order.
        this.app.layerService.layers.forEach(layer => {
            const li = document.createElement('li');
            li.className = 'layer-item';
            li.dataset.layerId = layer.id.toString();

            if (layer.id === this.app.layerService.activeLayerId) {
                li.classList.add('active');
            }
            
            li.innerHTML = `
                <button class="visibility-toggle ${!layer.isVisible ? 'hidden-layer' : ''}" data-i18n-tooltip="${layer.isVisible ? 'layers.visibility.hide' : 'layers.visibility.show'}">
                    <div class="icon icon-visibility-${layer.isVisible ? 'on' : 'off'}"></div>
                </button>
                <span class="layer-name">${layer.name}</span>
                <button class="lock-toggle ${layer.isLocked ? 'locked' : ''}" data-i18n-tooltip="${layer.isLocked ? 'layers.lock.unlock' : 'layers.lock.lock'}">
                    <div class="icon icon-${layer.isLocked ? 'lock' : 'unlock'}"></div>
                </button>
            `;
            this.listElement.appendChild(li);
        });
        
        this.updateControlButtonsState();
        
        // Update tooltips for the newly rendered elements
        this.app.i18n.updateDOM(); // Update any i18n keys we just added
        this.app.tooltipController.initListeners();
    }
}