/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "../app";
import { Point } from "../scene/point";
import { BuildingWindow } from "../scene/window";
import { Tool, ToolType } from "./tool";
import { findClosestWall } from "../utils/geometry";
import { WALL_MOUNT_SNAP_DISTANCE } from "../constants";

export class WindowTool extends Tool {
    /**
     * Конструктор інструменту для створення вікон.
     * @param app Екземпляр головного класу додатку.
     */
    constructor(app: App) {
        super(app, ToolType.WINDOW);
    }

    /**
     * Обробляє натискання кнопки миші для створення нового об'єкта "Вікно" на найближчій стіні.
     * @param point Координати у світовій системі.
     * @param _event Подія MouseEvent.
     */
    onMouseDown(point: Point, _event: MouseEvent): void {
        const tolerance = WALL_MOUNT_SNAP_DISTANCE / this.app.canvasController.zoom;
        // FIX: Use sceneService to access objects.
        const closest = findClosestWall(point, this.app.sceneService.objects, tolerance);
        if (closest) {
            const newObj = new BuildingWindow(
                // FIX: Use sceneService to get the next object ID.
                this.app.sceneService.getNextId(), 
                closest.closestPoint.x, 
                closest.closestPoint.y, 
                closest.wall.angle
            );
            this.app.addSceneObject(newObj);
            this.app.setSelectedObjectId(newObj.id);
        }
    }
    
    /**
     * Повертає стиль курсору для інструменту.
     */
    getCursor(): string {
        return 'crosshair';
    }
}
