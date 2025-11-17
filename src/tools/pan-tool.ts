/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "../app";
import { Point } from "../scene/point";
import { Tool, ToolType } from "./tool";

export class PanTool extends Tool {
    private isPanning = false;
    private lastPanPosition: Point = { x: 0, y: 0 };

    /**
     * Конструктор інструменту для панорамування.
     * @param app Екземпляр головного класу додатку.
     */
    constructor(app: App) {
        super(app, ToolType.PAN);
    }

    /**
     * Обробляє натискання кнопки миші для початку панорамування.
     * @param point Координати у світовій системі.
     * @param event Подія MouseEvent.
     */
    onMouseDown(point: Point, event: MouseEvent): void {
        this.isPanning = true;
        this.lastPanPosition = { x: event.clientX, y: event.clientY };
        this.app.inputHandler.updateCursor(this.getCursor());
    }
    
    /**
     * Обробляє рух миші для виконання панорамування.
     * @param point Координати у світовій системі.
     * @param event Подія MouseEvent.
     */
    onMouseMove(point: Point, event: MouseEvent): void {
        if (this.isPanning) {
            const dx = (event.clientX - this.lastPanPosition.x) * devicePixelRatio;
            const dy = (event.clientY - this.lastPanPosition.y) * devicePixelRatio;
            this.app.canvasController.panOffset.x += dx;
            this.app.canvasController.panOffset.y += dy;
            this.lastPanPosition = { x: event.clientX, y: event.clientY };
        }
    }
    
    /**
     * Обробляє відпускання кнопки миші для завершення панорамування.
     * @param point Координати у світовій системі.
     * @param event Подія MouseEvent.
     */
    onMouseUp(point: Point, event: MouseEvent): void {
        this.isPanning = false;
        this.app.inputHandler.updateCursor(this.getCursor());
    }
    
    /**
     * Активує інструмент, скидаючи стан панорамування.
     */
    activate(): void {
        super.activate();
        this.isPanning = false;
    }

    /**
     * Повертає стиль курсору для інструменту.
     */
    getCursor(): string {
        return this.app.inputHandler.isSpacebarPressed || this.isPanning ? 'grabbing' : 'grab';
    }
}