/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "../app";
import { Command } from "./command";
import { SceneObject } from "../scene/scene-object";
import { ToolType } from "../tools/tool";
import { I18nService } from "../i18n";
import { PolylineObject } from "../scene/polyline-object";
import { SketchObject } from "../scene/sketch-object";
import { ExtrudeObject } from "../scene/extrude-object";
import { Point } from "../scene/point";

/**
 * A command to create a 3D extrusion from a selected 2D shape.
 */
export class ExtrudeCommand implements Command {
    app: App;
    i18n: I18nService;
    type: ToolType = ToolType.EXTRUDE;

    /**
     * @param app The main application instance.
     */
    constructor(app: App) {
        this.app = app;
        this.i18n = app.i18n;
    }

    /**
     * Starts the command execution. It checks for a valid pre-selected object,
     * prompts the user for the extrusion height, and creates the 3D object.
     * @param preSelectedObjects An array of objects selected before the command was initiated.
     */
    async start(preSelectedObjects: SceneObject[] = []): Promise<void> {
        const sourceObject = preSelectedObjects[0];

        if (preSelectedObjects.length !== 1 || !sourceObject) {
            await this.app.dialogController.alert(this.i18n.t('toolbar.modification.extrude'), "Будь ласка, виберіть одну замкнуту полілінію або ескіз для видавлювання.");
            this.finish();
            return;
        }

        const isValidObject = (sourceObject instanceof PolylineObject && sourceObject.isClosed) || (sourceObject instanceof SketchObject);
        if (!isValidObject) {
            await this.app.dialogController.alert(this.i18n.t('toolbar.modification.extrude'), "Невірний об'єкт. Будь ласка, виберіть одну замкнуту полілінію або ескіз.");
            this.finish();
            return;
        }
        
        const heightStr = await this.app.dialogController.prompt(this.i18n.t('toolbar.modification.extrude'), "Введіть висоту видавлювання:", "100");
        const height = parseFloat(heightStr || '');
        if (isNaN(height) || height <= 0) {
            this.finish();
            return;
        }

        // Create the ExtrudeObject which references the source object.
        // The source object remains in the scene to be visible in 2D.
        // FIX: Use sceneService to get the next object ID.
        const newExtrudeObject = new ExtrudeObject(this.app.sceneService.getNextId(), sourceObject.id, height);
        this.app.addSceneObject(newExtrudeObject, false);

        // FIX: Use projectStateService for history.
        this.app.projectStateService.commit(`Extrude object ${sourceObject.id}`);
        this.app.setSelectedObjectId(newExtrudeObject.id);
        
        // Automatically switch to 3D view to show the result.
        this.app.toggle3dView(true);
        this.finish();
    }

    // --- Unused/Placeholder Command Methods ---
    finish(): void { this.app.commandFinished(); }
    cancel(): void { this.app.commandFinished(); }
    onMouseDown(point: Point, event: MouseEvent): void {}
    onMouseMove(point: Point, event: MouseEvent): void {}
    onMouseUp(point: Point, event: MouseEvent): void {}
    onKeyDown(event: KeyboardEvent): void {}
    onKeyUp(event: KeyboardEvent): void {}
    onContextMenu(worldPoint: Point, screenPoint: Point): void {}
    drawOverlay(ctx: CanvasRenderingContext2D, zoom: number): void {}
    activate(): void {}
    deactivate(): void {}
    getCursor(): string { return 'default'; }
}
