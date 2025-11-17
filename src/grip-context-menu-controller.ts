/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { App } from "./app";
import { Grip, GripAction } from "./grips";
import { SelectTool } from "./tools/select-tool";
import { ToolType } from "./tools/tool";
import { I18nService } from "./i18n";

export class GripContextMenuController {
    private app: App;
    private i18n: I18nService;
    private element: HTMLElement;
    private activeGrip: Grip | null = null;
    private buttons: Map<GripAction, HTMLButtonElement> = new Map();

    constructor(app: App) {
        this.app = app;
        this.i18n = app.i18n;
        this.element = document.getElementById('grip-context-menu')!;
        
        this.createButtons();
        this.initListeners();
    }
    
    private createButtons(): void {
        this.element.innerHTML = ''; // Clear any existing static content
        const actions: GripAction[] = ['STRETCH', 'MOVE', 'ROTATE', 'SCALE'];
        actions.forEach(action => {
            const button = document.createElement('button');
            button.setAttribute('role', 'menuitem');
            button.dataset.action = action;
            this.element.appendChild(button);
            this.buttons.set(action, button);
        });
    }

    private initListeners(): void {
        this.element.addEventListener('mousedown', e => e.stopPropagation());
        this.element.addEventListener('click', e => {
            const target = e.target as HTMLElement;
            const action = target.dataset.action as GripAction | undefined;
            if (action && this.activeGrip) {
                const selectTool = this.app.getTool(ToolType.SELECT) as SelectTool;
                if (selectTool) {
                    selectTool.startGripAction(this.activeGrip, action);
                }
            }
            this.hide();
        });
        window.addEventListener('mousedown', () => this.hide());
    }
    
    private updateButtonLabels(): void {
        this.buttons.get('STRETCH')!.textContent = this.i18n.t('gripContextMenu.stretch');
        this.buttons.get('MOVE')!.textContent = this.i18n.t('gripContextMenu.move');
        this.buttons.get('ROTATE')!.textContent = this.i18n.t('gripContextMenu.rotate');
        this.buttons.get('SCALE')!.textContent = this.i18n.t('gripContextMenu.scale');
    }

    public show(x: number, y: number, grip: Grip): void {
        this.activeGrip = grip;
        this.updateButtonLabels();
        
        this.element.style.left = `${x}px`;
        this.element.style.top = `${y}px`;
        this.element.classList.remove('hidden');
    }

    public hide(): void {
        if (this.element.classList.contains('hidden')) return;
        this.element.classList.add('hidden');
        this.activeGrip = null;
    }
}
