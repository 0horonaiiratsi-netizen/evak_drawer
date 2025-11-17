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
        const selectedObject = this.app.sceneService.objects.find(obj => obj.id === selectedId);

        if (selectedObject && selectedObject instanceof PolylineObject && selectedObject.isClosed) {
            // Create a new Hatch object using the polyline's boundary
            const hatch = new HatchObject(this.app.sceneService.getNextId(), selectedObject.points);
            
            // Replace the polyline with the new hatch object
            const layer = this.app.layerService.getLayerForObject(selectedId);
            if(layer) {
                const index = layer.objectIds.indexOf(selectedId);
                if (index > -1) {
                    layer.objectIds.splice(index, 1);
                }
            }

            const sceneIndex = this.app.sceneService.objects.indexOf(selectedObject);
            if(sceneIndex > -1) {
                this.app.sceneService.objects.splice(sceneIndex, 1);
            }
            
            this.app.addSceneObject(hatch, false);

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