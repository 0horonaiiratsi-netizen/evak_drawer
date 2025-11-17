/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { App } from "../app";
import { Point } from "../scene/point";

export enum ToolType {
    SELECT,
    PAN,
    WALL,
    DOOR,
    WINDOW,
    STAIRS,
    TEXT,
    EVACUATION_PATH,
    EMERGENCY_EVACUATION_PATH,
    SCALE_BY_REFERENCE,
    ROTATE_BY_REFERENCE,
    POLYLINE,
    CIRCLE,
    ARC,
    HATCH,
    SKETCH,
    TRIM,
    EXTEND,
    OFFSET,
    MIRROR,
    FILLET,
    CHAMFER,
    MATCHPROP,
    DIMLINEAR,
    DIMALIGNED,
    HORIZONTAL_CONSTRAINT,
    VERTICAL_CONSTRAINT,
    PARALLEL_CONSTRAINT,
    PERPENDICULAR_CONSTRAINT,
    ANGLE_CONSTRAINT,
    LENGTH_CONSTRAINT,
    TANGENT_CONSTRAINT,
    BLOCK,
    INSERT,
    EXTRUDE,
    REVOLVE,
    // FIX: Add CUT to the enum.
    CUT,
    SWEEP,
    LOFT,
    THREE_D_FILLET,
    THREE_D_CHAMFER,
}

/**
 * Абстрактний базовий клас для всіх інструментів у додатку.
 */
export abstract class Tool {
    app: App;
    type: ToolType;

    /**
     * Конструктор класу Tool.
     * @param app Екземпляр головного класу додатку.
     * @param type Тип інструменту з переліку ToolType.
     */
    constructor(app: App, type: ToolType) {
        this.app = app;
        this.type = type;
    }
    
    /**
     * Викликається при активації інструменту.
     */
    activate(): void {
        this.app.inputHandler.updateCursor(this.getCursor());
    }
    /**
     * Викликається при деактивації інструменту.
     */
    deactivate(): void {
        // Base implementation does nothing, can be overridden by tools that need cleanup.
    }
    
    /**
     * Обробляє подію натискання кнопки миші.
     * @param point Координати у світовій системі.
     * @param event Подія MouseEvent.
     */
    onMouseDown(point: Point, event: MouseEvent): void {}
    /**
     * Обробляє подію руху миші.
     * @param point Координати у світовій системі.
     * @param event Подія MouseEvent.
     */
    onMouseMove(point: Point, event: MouseEvent): void {}
    /**
     * Обробляє подію відпускання кнопки миші.
     * @param point Координати у світовій системі.
     * @param event Подія MouseEvent.
     */
    onMouseUp(point: Point, event: MouseEvent): void {}
    /**
     * Обробляє подію натискання клавіші на клавіатурі.
     * @param event Подія KeyboardEvent.
     */
    onKeyDown(event: KeyboardEvent): void {}
    /**
     * Обробляє подію відпускання клавіші на клавіатурі.
     * @param event Подія KeyboardEvent.
     */
    onKeyUp(event: KeyboardEvent): void {}
    /**
     * Обробляє подію контекстного меню (права кнопка миші).
     * @param worldPoint Координати у світовій системі.
     * @param screenPoint Координати в екранній системі.
     */
    onContextMenu(worldPoint: Point, screenPoint: Point): void {}

    /**
     * Малює тимчасові елементи (оверлей) для інструменту, наприклад, рамку виділення.
     * @param ctx Контекст для малювання.
     * @param zoom Поточний рівень масштабування.
     */
    drawOverlay(ctx: CanvasRenderingContext2D, zoom: number): void {}

    /**
     * Повертає рядок, що представляє CSS-стиль курсору для цього інструменту.
     */
    abstract getCursor(): string;
}
