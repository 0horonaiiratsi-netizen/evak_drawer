/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "../app";
import { Point } from "../scene/point";
import { Tool, ToolType } from "./tool";
import { HatchObject } from "../scene/hatch-object";
import { PolylineObject } from "../scene/polyline-object";

export class HatchTool extends Tool {

    constructor(app: App) {
        super(app, ToolType.HATCH);
    }
    
    async activate(): Promise<void> {
        super.activate();
        await this.app.dialogController.alert(
            "Штрихування",
            "Виберіть одну замкнуту полілінію, щоб перетворити її на штрихування."
        );
        // This tool is not interactive; it works on the current selection.
        this.createHatchFromSelection();
    }

    private createHatchFromSelection() {
        if (this.app.selectionService.selectedIds.length !== 1) {
            this.app.setActiveTool(ToolType.SELECT);
            return;
        }
        
        const selectedId = this.app.selectionService.selectedIds[0];
        // FIX: Use sceneService to find the object.
        const selectedObject = this.app.sceneService.findById(selectedId);

        if (selectedObject && selectedObject instanceof PolylineObject && selectedObject.isClosed) {
            // Create a new Hatch object using the polyline's boundary
            // FIX: Use sceneService to get the next object ID.
            const hatch = new HatchObject(this.app.sceneService.getNextId(), selectedObject.points);
            
            // FIX: Use services to remove the old object and add the new one.
            this.app.sceneService.removeById(selectedId);
            this.app.layerService.removeObjectFromLayers(selectedId);
            
            this.app.addSceneObject(hatch, false);

            // FIX: Use projectStateService for history.
            this.app.projectStateService.commit("Create Hatch");
            this.app.selectionService.setSingle(hatch.id);

        } else {
            this.app.dialogController.alert("Помилка", "Будь ласка, виберіть одну замкнуту полілінію.");
        }

        // Switch back to select tool after operation
        this.app.setActiveTool(ToolType.SELECT);
    }
    
    getCursor(): string {
        return 'crosshair';
    }
}
