/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { App } from "../app";
import { Point } from "../scene/point";
import { ExtrudeObject } from "../scene/extrude-object";
import { RevolveObject } from "../scene/revolve-object";
import { Tool, ToolType } from "./tool";

export class ThreeDChamferTool extends Tool {
    private distance: number | null = null;
    private selectedObject: (ExtrudeObject | RevolveObject) | null = null;

    constructor(app: App) {
        super(app, ToolType.THREE_D_CHAMFER);
    }

    async activate(): Promise<void> {
        super.activate();
        const distanceStr = await this.app.dialogController.prompt("3D Фаска", "Введіть відстань фаски:", "5");
        const distance = parseFloat(distanceStr || '');

        if (isNaN(distance) || distance <= 0) {
            this.app.setActiveTool(ToolType.SELECT);
            return;
        }
        this.distance = distance;
        this.app.dialogController.alert("3D Фаска", "Виберіть 3D об'єкт (Extrude або Revolve) для застосування фаски.");
    }

    onMouseDown(point: Point, event: MouseEvent): void {
        const tolerance = 5 / this.app.canvasController.zoom;
        const targetObject = this.app.sceneService.objects.find(obj =>
            (obj instanceof ExtrudeObject || obj instanceof RevolveObject) && obj.contains(point, tolerance, this.app)
        ) as ExtrudeObject | RevolveObject | undefined;

        if (!targetObject || !this.distance) return;

        if (!this.selectedObject) {
            this.selectedObject = targetObject;
            this.app.dialogController.alert("3D Фаска", "Об'єкт вибрано. Застосовується фаска.");
        } else if (this.selectedObject.id === targetObject.id) {
            this.applyChamfer(targetObject);
            this.resetAndSwitchToSelect();
        }
    }

    private applyChamfer(obj: ExtrudeObject | RevolveObject): void {
        if (!this.distance) return;

        if (obj instanceof ExtrudeObject) {
            obj.chamferDistance = this.distance;
        } else if (obj instanceof RevolveObject) {
            obj.chamferDistance = this.distance;
        }

        // Invalidate mesh to recreate with chamfer
        obj['mesh'] = null; // Private, but for simplicity

        this.app.projectStateService.commit("Apply 3D Chamfer");
        this.app.canvasController.draw();
    }

    protected reset(): void {
        this.distance = null;
        this.selectedObject = null;
    }

    protected resetAndSwitchToSelect(): void {
        this.reset();
        this.app.setActiveTool(ToolType.SELECT);
    }

    deactivate(): void {
        this.reset();
    }

    getCursor(): string {
        return 'crosshair';
    }
}
