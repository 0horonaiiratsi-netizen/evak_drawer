/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "../app";
import { Command } from "./command";
import { Point } from "../scene/point";
import { SceneObject } from "../scene/scene-object";
import { ToolType } from "../tools/tool";
import { I18nService } from "../i18n";
import { BlockDefinition } from "../scene/block-definition";
import { BlockReference } from "../scene/block-reference";

export class BlockCommand implements Command {
    app: App;
    i18n: I18nService;
    type: ToolType = ToolType.BLOCK;
    
    private step: 'selectingObjects' | 'promptingBasePoint' = 'selectingObjects';
    private objects: SceneObject[] = [];
    private basePoint: Point | null = null;
    private replace: boolean = true; // Default to replacing original objects

    constructor(app: App) {
        this.app = app;
        this.i18n = app.i18n;
    }

    start(preSelectedObjects: SceneObject[] = []): void {
        this.reset();
        if (preSelectedObjects.length > 0) {
            this.objects = preSelectedObjects;
            this.app.selectionService.set(this.objects.map(o => o.id));
            this.step = 'promptingBasePoint';
            this.app.commandLineController.setPrompt(this.i18n.t('command.block.prompt.basePoint'));
        } else {
            this.step = 'selectingObjects';
            this.app.commandLineController.setPrompt(this.i18n.t('command.block.prompt.selectObjects'));
        }
    }
    
    finish(): void {
        this.cleanup();
        this.app.commandFinished();
    }

    cancel(): void {
        this.cleanup();
        this.app.commandFinished();
    }

    private cleanup(): void {
        this.reset();
        this.app.selectionService.set([]);
        this.app.draw();
    }
    
    private reset(): void {
        this.step = 'selectingObjects';
        this.objects = [];
        this.basePoint = null;
    }

    async onMouseDown(point: Point, event: MouseEvent): Promise<void> {
        if (this.step === 'selectingObjects') {
            const tolerance = 5 / this.app.canvasController.zoom;
            const clickedObject = [...this.app.sceneService.objects].reverse().find(obj => obj.contains(point, tolerance, this.app));
            if (clickedObject) {
                const index = this.objects.findIndex(o => o.id === clickedObject.id);
                if (index > -1) {
                    this.objects.splice(index, 1);
                } else {
                    this.objects.push(clickedObject);
                }
                this.app.selectionService.set(this.objects.map(o => o.id));
            }
        } else if (this.step === 'promptingBasePoint') {
            this.basePoint = point;
            await this.promptForNameAndCreate();
        }
    }
    
    private async promptForNameAndCreate(): Promise<void> {
        try {
            const name = await this.app.dialogController.prompt(
                this.i18n.t('command.block.dialog.nameTitle'),
                this.i18n.t('command.block.dialog.nameMessage')
            );
            
            if (name && name.trim()) {
                if (this.app.projectStateService.blockDefinitions.has(name.trim())) {
                    // TODO: Add overwrite confirmation
                    throw new Error('Block name already exists.');
                }
                
                if (!this.basePoint || this.objects.length === 0) throw new Error('Internal error: Base point or objects missing.');

                const definition = BlockDefinition.fromSceneObjects(name.trim(), this.basePoint, this.objects, this.app);
                this.app.projectStateService.blockDefinitions.set(definition.name, definition);

                if (this.replace) {
                    this.objects.forEach(obj => {
                        this.app.sceneService.removeById(obj.id);
                        this.app.layerService.removeObjectFromLayers(obj.id);
                    });
                    const reference = new BlockReference(this.app.sceneService.getNextId(), definition.name, this.basePoint);
                    this.app.addSceneObject(reference, false);
                    this.app.selectionService.setSingle(reference.id);
                }
                this.app.projectStateService.commit(`Create block "${definition.name}"`);
            }
        } catch (e) {
            console.error(e);
            // Error or cancellation in dialog
        } finally {
            this.finish();
        }
    }

    onMouseMove(point: Point, event: MouseEvent): void {}
    onMouseUp(point: Point, event: MouseEvent): void {}
    
    onKeyDown(event: KeyboardEvent): void { 
        if (event.key === 'Enter') {
            if (this.step === 'selectingObjects' && this.objects.length > 0) {
                this.step = 'promptingBasePoint';
                this.app.commandLineController.setPrompt(this.i18n.t('command.block.prompt.basePoint'));
            }
        }
    }
    
    onKeyUp(event: KeyboardEvent): void {}
    
    onContextMenu(worldPoint: Point, screenPoint: Point): void {
        if (this.step === 'selectingObjects' && this.objects.length > 0) {
            this.step = 'promptingBasePoint';
            this.app.commandLineController.setPrompt(this.i18n.t('command.block.prompt.basePoint'));
        } else {
            this.cancel();
        }
    }
    
    drawOverlay(ctx: CanvasRenderingContext2D, zoom: number): void {}
    activate(): void {}
    deactivate(): void { this.cancel(); }
    getCursor(): string { return 'crosshair'; }
}