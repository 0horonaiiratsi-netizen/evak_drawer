/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from './app';
import { WallType } from './scene/wall';
import { ToolType } from './tools/tool';
import { WallTool } from './tools/wall-tool';

export class WallToolOptionsController {
    private app: App;
    private panel: HTMLElement;
    private buttons: HTMLElement[];

    constructor(app: App) {
        this.app = app;
        this.panel = document.getElementById('wall-tool-options')!;
        this.buttons = Array.from(this.panel.querySelectorAll('.wall-type-button'));
        this.init();
    }

    private init(): void {
        this.buttons.forEach(button => {
            button.addEventListener('click', () => {
                const wallType = button.dataset.wallType as WallType;
                
                const wallTool = this.app.getTool(ToolType.WALL) as WallTool | undefined;
                if (wallTool) {
                    wallTool.selectedWallType = wallType;
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