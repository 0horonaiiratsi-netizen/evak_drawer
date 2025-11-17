/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { SceneObject } from "./scene-object";
import { WallMountedObject } from "./wall-mounted-object";
import { App } from "../app";

export class Door extends WallMountedObject {
    /**
     * Конструктор класу Door.
     * @param id Унікальний ідентифікатор об'єкта.
     * @param x X-координата центру.
     * @param y Y-координата центру.
     * @param angle Кут повороту в радіанах.
     */
    constructor(id: number, x: number, y: number, angle: number) { 
        super(id, x, y, 40, 10, angle); 
    }

    /**
     * Малює об'єкт "Двері" на заданому контексті canvas.
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
        
        ctx.strokeStyle = isSelected 
            ? getComputedStyle(document.documentElement).getPropertyValue('--selected-stroke-color') 
            : wallColor;

        // Clear space in the wall
        ctx.fillStyle = bgColor;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        
        // Door representation
        ctx.lineWidth = isExport ? 1.5 : 2 / zoom;
        ctx.strokeRect(-this.width/2, -this.height/2, this.width, this.height);
        
        // Draw door swing arc
        ctx.beginPath();
        ctx.moveTo(-this.width/2, -this.height/2);
        ctx.arc(-this.width/2, -this.height/2, this.width, 0, Math.PI / 2);
        ctx.stroke();

        ctx.restore();
    }

    /**
     * Створює глибоку копію об'єкта.
     * @param newId Новий унікальний ідентифікатор для копії.
     */
    clone(newId: number, app?: App): Door {
        const newDoor = new Door(newId, this.x, this.y, this.angle);
        newDoor.width = this.width;
        newDoor.height = this.height;
        return newDoor;
    }
    
    /**
     * Серіалізує об'єкт у JSON-сумісний формат.
     */
    toJSON() {
        return {
            type: 'door',
            id: this.id,
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            angle: this.angle,
        };
    }

    /**
     * Створює екземпляр Door з JSON-даних.
     * @param data Дані для десеріалізації.
     */
    static fromJSON(data: any): Door {
        const door = new Door(data.id, data.x, data.y, data.angle);
        // Restore other properties if they become customizable
        door.width = data.width ?? 40;
        door.height = data.height ?? 10;
        return door;
    }
}
