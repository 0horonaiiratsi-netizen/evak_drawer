/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { App } from "../app";
import { Point } from "../scene/point";
import { ExtrudeObject } from "../scene/extrude-object";
import { RevolveObject } from "../scene/revolve-object";
import { Tool, ToolType } from "./tool";

export class ThreeDFilletTool extends Tool {
    private radius: number | null = null;
    private selectedObject: (ExtrudeObject | RevolveObject) | null = null;

    constructor(app: App) {
        super(app, ToolType.THREE_D_FILLET);
    }

    async activate(): Promise<void> {
        super.activate();
        const radiusStr = await this.app.dialogController.prompt("3D Скруглення", "Введіть радіус скруглення:", "5");
        const radius = parseFloat(radiusStr || '');

        if (isNaN(radius) || radius <= 0) {
            this.app.setActiveTool(ToolType.SELECT);
            return;
        }
        this.radius = radius;
        this.app.dialogController.alert("3D Скруглення", "Виберіть 3D об'єкт (Extrude або Revolve) для застосування скруглення.");
    }

    onMouseDown(point: Point, event: MouseEvent): void {
        const tolerance = 5 / this.app.canvasController.zoom;
        const targetObject = this.app.sceneService.objects.find(obj => 
            (obj instanceof ExtrudeObject || obj instanceof RevolveObject) && obj.contains(point, tolerance, this.app)
        ) as ExtrudeObject | RevolveObject | undefined;

        if (!targetObject || !this.radius) return;

        if (!this.selectedObject) {
            this.selectedObject = targetObject;
            this.app.dialogController.alert("3D Скруглення", "Об'єкт вибрано. Застосовується скруглення.");
        } else if (this.selectedObject.id === targetObject.id) {
            this.applyFillet(targetObject);
            this.resetAndSwitchToSelect();
        }
    }

    private applyFillet(obj: ExtrudeObject | RevolveObject): void {
        if (!this.radius) return;

        if (obj instanceof ExtrudeObject) {
            obj.filletRadius = this.radius;
        } else if (obj instanceof RevolveObject) {
            obj.filletRadius = this.radius;
        }

        // Invalidate mesh to recreate with fillet
        obj['mesh'] = null; // Private, but for simplicity

        this.app.projectStateService.commit("Apply 3D Fillet");
        this.app.canvasController.draw();
    }

    protected reset(): void {
        this.radius = null;
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
