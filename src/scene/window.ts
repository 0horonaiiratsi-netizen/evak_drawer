/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { App } from "../app";
import { SceneObject } from "./scene-object";
import { WallMountedObject } from "./wall-mounted-object";

export class BuildingWindow extends WallMountedObject {
    /**
     * Конструктор класу BuildingWindow.
     * @param id Унікальний ідентифікатор об'єкта.
     * @param x X-координата центру.
     * @param y Y-координата центру.
     * @param angle Кут повороту в радіанах.
     */
    constructor(id: number, x: number, y: number, angle: number) { 
        super(id, x, y, 50, 8, angle); 
    }

    /**
     * Малює об'єкт "Вікно" на заданому контексті canvas.
     * @param ctx Контекст для малювання.
     * @param isSelected Чи є об'єкт виділеним.
     * @param zoom Поточний рівень масштабування.
     * @param allVisibleObjects Масив усіх видимих об'єктів на сцені.
     * @param app Екземпляр головного класу додатку.
     */
    draw(ctx: CanvasRenderingContext2D, isSelected: boolean, zoom: number, allVisibleObjects: readonly SceneObject[], app: App): void {
        const isExport = ctx.canvas.id !== 'app-canvas';

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        const wallColor = getComputedStyle(document.documentElement).getPropertyValue('--wall-color');
        const bgColor = isExport
            ? '#FFFFFF'
            : getComputedStyle(document.documentElement).getPropertyValue('--background-color');
        const selectedColor = getComputedStyle(document.documentElement).getPropertyValue('--selected-stroke-color');

        ctx.strokeStyle = isSelected ? selectedColor : wallColor;

        // Clear space in the wall
        ctx.fillStyle = bgColor;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

        // Window frame
        ctx.lineWidth = isExport ? 1.5 : 2 / zoom;
        ctx.strokeRect(-this.width/2, -this.height/2, this.width, this.height);
        
        // Center line for glass pane
        ctx.beginPath();
        ctx.moveTo(-this.width / 2, 0);
        ctx.lineTo(this.width / 2, 0);
        ctx.stroke();

        ctx.restore();
    }
    
    /**
     * Створює глибоку копію об'єкта.
     * @param newId Новий унікальний ідентифікатор для копії.
     */
    clone(newId: number, app?: App): BuildingWindow {
        const newWindow = new BuildingWindow(newId, this.x, this.y, this.angle);
        newWindow.width = this.width;
        newWindow.height = this.height;
        return newWindow;
    }

    /**
     * Серіалізує об'єкт у JSON-сумісний формат.
     */
    toJSON() {
        return {
            type: 'window',
            id: this.id,
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            angle: this.angle,
        };
    }

    /**
     * Створює екземпляр BuildingWindow з JSON-даних.
     * @param data Дані для десеріалізації.
     */
    static fromJSON(data: any): BuildingWindow {
        const windowObj = new BuildingWindow(data.id, data.x, data.y, data.angle);
        windowObj.width = data.width ?? 50;
        windowObj.height = data.height ?? 8;
        return windowObj;
    }
}
