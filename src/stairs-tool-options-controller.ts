/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from './app';
import { StairsType } from './scene/stairs-object';
import { ToolType } from './tools/tool';
import { StairsTool } from './tools/stairs-tool';

export class StairsToolOptionsController {
    private app: App;
    private panel: HTMLElement;
    private buttons: HTMLElement[];

    constructor(app: App) {
        this.app = app;
        this.panel = document.getElementById('stairs-tool-options')!;
        this.buttons = Array.from(this.panel.querySelectorAll('.context-button'));
        this.init();
    }

    private init(): void {
        this.buttons.forEach(button => {
            button.addEventListener('click', () => {
                const stairsType = button.dataset.stairsType as StairsType;
                
                const stairsTool = this.app.getTool(ToolType.STAIRS) as StairsTool | undefined;
                if (stairsTool) {
                    stairsTool.selectedStairsType = stairsType;
                }
                
                this.setActiveButton(button);
            });
        });
    }

    private setActiveButton(activeButton: HTMLElement): void {
        this.buttons.forEach(btn => {
            btn.classList.toggle('active', btn === activeButton);
        });
    }

    public setVisibility(isVisible: boolean): void {
        this.panel.classList.toggle('visible', isVisible);
    }
}