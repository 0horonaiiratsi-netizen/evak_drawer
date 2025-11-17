/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from '../app';
import { ToolbarManager } from '../toolbar-controller';
import { ToolType } from '../tools/tool';
import { HistoryObserver } from './interfaces';

export class PrimaryToolbarController implements HistoryObserver {
    private app: App;
    private toolbarManager: ToolbarManager;

    private undoButton: HTMLButtonElement;
    private redoButton: HTMLButtonElement;

    constructor(app: App, toolbarManager: ToolbarManager) {
        this.app = app;
        this.toolbarManager = toolbarManager;

        this.undoButton = document.getElementById('undo-button') as HTMLButtonElement;
        this.redoButton = document.getElementById('redo-button') as HTMLButtonElement;

        this.initListeners();
        this.updateHistoryButtons();
    }

    private initListeners(): void {
        document.getElementById('select-tool')?.addEventListener('click', () => this.app.setActiveTool(ToolType.SELECT));
        document.getElementById('pan-tool')?.addEventListener('click', () => this.app.setActiveTool(ToolType.PAN));
        document.getElementById('toggle-3d-view')?.addEventListener('click', () => this.app.toggle3dView());

        this.toolbarManager.secondaryToolbars.forEach(mapping => {
            mapping.button.addEventListener('click', () => {
                this.toolbarManager.toggleToolbar(mapping.toolbar);
            });
        });

        document.getElementById('layers-toggle')?.addEventListener('click', () => this.app.toggleLayersWindow());
        document.getElementById('properties-toggle')?.addEventListener('click', () => this.app.togglePropertiesWindow());
        document.getElementById('style-manager-toggle')?.addEventListener('click', () => this.app.toggleStyleManagerWindow());
        document.getElementById('dimension-style-manager-toggle')?.addEventListener('click', () => this.app.toggleDimensionStyleManagerWindow());
        document.getElementById('log-viewer-toggle')?.addEventListener('click', () => this.app.toggleLogViewerWindow());

        this.undoButton.addEventListener('click', () => this.app.projectStateService.undo());
        this.redoButton.addEventListener('click', () => this.app.projectStateService.redo());
        
        document.getElementById('window-container')!.addEventListener('window-hidden', this.handleWindowVisibilityChange.bind(this));
        document.getElementById('window-container')!.addEventListener('window-shown', this.handleWindowVisibilityChange.bind(this));
    }

    public onHistoryChanged(): void {
        this.updateHistoryButtons();
    }

    public updateHistoryButtons(): void {
        this.undoButton.disabled = !this.app.projectStateService.canUndo();
        this.redoButton.disabled = !this.app.projectStateService.canRedo();
    }
    
    private handleWindowVisibilityChange(event: Event): void {
        const customEvent = event as CustomEvent;
        if (!customEvent.detail || !customEvent.detail.windowId) return;
    
        const { windowId } = customEvent.detail;
        const isVisible = event.type === 'window-shown';
    
        const buttonMap: { [key: string]: HTMLElement | null } = {
            'layers-window': document.getElementById('layers-toggle'),
            'properties-window': document.getElementById('properties-toggle'),
            'style-manager-window': document.getElementById('style-manager-toggle'),
            'dimension-style-manager-window': document.getElementById('dimension-style-manager-toggle'),
            'log-viewer-window': document.getElementById('log-viewer-toggle'),
        };

        const button = buttonMap[windowId];
        if (button) {
            button.classList.toggle('active', isVisible);
        }
    }
    
    public syncToggleButtons(): void {
        const checkVisibility = (windowId: string, buttonId: string) => {
            const windowEl = document.getElementById(windowId);
            const buttonEl = document.getElementById(buttonId);
            if(windowEl && buttonEl) {
                buttonEl.classList.toggle('active', !windowEl.classList.contains('hidden'));
            }
        };

        checkVisibility('layers-window', 'layers-toggle');
        checkVisibility('properties-window', 'properties-toggle');
        checkVisibility('style-manager-window', 'style-manager-toggle');
        checkVisibility('dimension-style-manager-window', 'dimension-style-manager-toggle');
        checkVisibility('log-viewer-window', 'log-viewer-toggle');
    }
}