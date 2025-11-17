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
import { BlockReference } from "../scene/block-reference";

export class InsertCommand implements Command {
    app: App;
    i18n: I18nService;
    type: ToolType = ToolType.INSERT;
    
    private step: 'promptingName' | 'placingBlock' = 'promptingName';
    private blockName: string | null = null;
    private preview: BlockReference | null = null;
    
    constructor(app: App) {
        this.app = app;
        this.i18n = app.i18n;
    }

    async start(preSelectedObjects?: SceneObject[]): Promise<void> {
        this.app.setSelectedObjectIds([]);
        this.reset();
        this.step = 'promptingName';
        
        try {
            const name = await this.app.dialogController.prompt(
                this.i18n.t('command.insert.prompt.name'),
                ''
            );
            
            if (name && name.trim()) {
                if (!this.app.projectStateService.blockDefinitions.has(name.trim())) {
                    this.app.commandLineController.setPrompt(this.i18n.t('command.insert.error.notFound', name.trim()));
                    throw new Error('Block not found.');
                }
                this.blockName = name.trim();
                this.step = 'placingBlock';
                this.app.commandLineController.setPrompt(this.i18n.t('command.insert.prompt.insertionPoint'));
            } else {
                throw new Error('No name provided.');
            }
        } catch (e) {
            console.error(e);
            this.finish();
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
        this.app.draw();
    }
    
    private reset(): void {
        this.step = 'promptingName';
        this.blockName = null;
        this.preview = null;
    }

    onMouseDown(point: Point, event: MouseEvent): void {
        if (this.step === 'placingBlock' && this.blockName) {
            const ref = new BlockReference(this.app.sceneService.getNextId(), this.blockName, point);
            this.app.addSceneObject(ref);
            this.app.setSelectedObjectId(ref.id);
            this.finish();
        }
    }

    onMouseMove(point: Point, event: MouseEvent): void {
        if (this.step === 'placingBlock' && this.blockName) {
            this.preview = new BlockReference(0, this.blockName, point);
            this.app.draw();
        }
    }

    onMouseUp(point: Point, event: MouseEvent): void {}
    onKeyDown(event: KeyboardEvent): void {}
    onKeyUp(event: KeyboardEvent): void {}
    
    onContextMenu(worldPoint: Point, screenPoint: Point): void {
        this.cancel();
    }
    
    drawOverlay(ctx: CanvasRenderingContext2D, zoom: number): void {
        if (this.preview) {
            this.preview.draw(ctx, false, zoom, [], this.app);
        }
    }
    
    activate(): void {}
    deactivate(): void { this.cancel(); }
    getCursor(): string { return 'crosshair'; }
}