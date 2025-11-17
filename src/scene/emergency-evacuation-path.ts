/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "../app";
import { EvacuationPath } from "./evacuation-path";

export class EmergencyEvacuationPath extends EvacuationPath {

    draw(ctx: CanvasRenderingContext2D, isSelected: boolean, zoom: number, allVisibleObjects: readonly import("./scene-object").SceneObject[], app: App): void {
        ctx.save();
        ctx.setLineDash([this.width * 2, this.width * 1.5]);
        super.draw(ctx, isSelected, zoom, allVisibleObjects, app);
        ctx.restore();
    }

    clone(newId: number, app?: App): EmergencyEvacuationPath {
        const newPoints = this.points.map(p => ({ ...p }));
        const newPath = new EmergencyEvacuationPath(newId, newPoints);
        newPath.color = this.color;
        newPath.width = this.width;
        return newPath;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            type: 'emergencyEvacuationPath',
        };
    }

    static fromJSON(data: any): EmergencyEvacuationPath {
        const path = new EmergencyEvacuationPath(data.id, data.points);
        path.color = data.color ?? '#4CAF50';
        path.width = data.width ?? 5;
        return path;
    }
}
