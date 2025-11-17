/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "../app";
import { Grip, GripType } from "../grips";
import { Point } from "./point";
import { BoundingBox, SceneObject } from "./scene-object";

/** Перелік усіх доступних типів символів, що використовуються на схемі. */
export enum SymbolType {
    FIRE_EXTINGUISHER = 'FIRE_EXTINGUISHER',
    EXIT = 'EXIT',
    FIRST_AID = 'FIRST_AID',
    FIRE_HYDRANT = 'FIRE_HYDRANT',
    ELECTRICAL_PANEL = 'ELECTRICAL_PANEL',
    COLUMN = 'COLUMN',
    // --- Standard 1:500 Topographic Symbols ---
    GEODETIC_POINT = 'GEODETIC_POINT',
    MANHOLE = 'MANHOLE',
    POWER_POLE = 'POWER_POLE',
    LAMPPOST = 'LAMPPOST',
    DECIDUOUS_TREE = 'DECIDUOUS_TREE',
    CONIFEROUS_TREE = 'CONIFEROUS_TREE',
}

/** Мапа функцій для візуалізації кожного типу символу. */
export const SYMBOL_RENDERERS: Record<SymbolType, (ctx: CanvasRenderingContext2D, isSelected: boolean, color: string) => void> = {
    [SymbolType.FIRE_EXTINGUISHER]: (ctx, isSelected, color) => {
        const path = new Path2D("M12 8V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v4 M6 8h8v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8z M14 8h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2");
        ctx.strokeStyle = isSelected ? getComputedStyle(document.documentElement).getPropertyValue('--selected-stroke-color') : color;
        ctx.stroke(path);
    },
    [SymbolType.EXIT]: (ctx, isSelected, color) => {
        const path = new Path2D("M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4 M10 17l5-5-5-5 M15 12H3");
        ctx.strokeStyle = isSelected ? getComputedStyle(document.documentElement).getPropertyValue('--selected-stroke-color') : color;
        ctx.stroke(path);
    },
    [SymbolType.FIRST_AID]: (ctx, isSelected, color) => {
        const path = new Path2D("M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z M12 8v8 M8 12h8");
        ctx.strokeStyle = isSelected ? getComputedStyle(document.documentElement).getPropertyValue('--selected-stroke-color') : color;
        ctx.stroke(path);
    },
    [SymbolType.FIRE_HYDRANT]: (ctx, isSelected, color) => {
        const path = new Path2D("M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M12 10v6 M9 13h6");
        ctx.strokeStyle = isSelected ? getComputedStyle(document.documentElement).getPropertyValue('--selected-stroke-color') : color;
        ctx.stroke(path);
    },
    [SymbolType.ELECTRICAL_PANEL]: (ctx, isSelected, color) => {
        const path = new Path2D("M12 2L3 14h9l-2 8 9-12h-9z");
        ctx.strokeStyle = isSelected ? getComputedStyle(document.documentElement).getPropertyValue('--selected-stroke-color') : color;
        ctx.stroke(path);
    },
    [SymbolType.COLUMN]: (ctx, isSelected, color) => {
        const path = new Path2D("M4 4h16v16H4z M4 4l16 16 M20 4L4 20");
        ctx.strokeStyle = isSelected ? getComputedStyle(document.documentElement).getPropertyValue('--selected-stroke-color') : color;
        ctx.stroke(path);
    },
    [SymbolType.GEODETIC_POINT]: (ctx, isSelected, color) => {
        const path = new Path2D("M12 2 L20 18 H4 Z");
        const dot = new Path2D("M12 12 a1.5 1.5 0 1 0 0 0.001Z");
        ctx.strokeStyle = isSelected ? getComputedStyle(document.documentElement).getPropertyValue('--selected-stroke-color') : color;
        ctx.stroke(path);
        ctx.fillStyle = isSelected ? getComputedStyle(document.documentElement).getPropertyValue('--selected-stroke-color') : color;
        ctx.fill(dot);
    },
    [SymbolType.MANHOLE]: (ctx, isSelected, color) => {
        const path = new Path2D("M20 12 a8 8 0 1 1-16 0 a8 8 0 1 1 16 0Z");
        ctx.strokeStyle = isSelected ? getComputedStyle(document.documentElement).getPropertyValue('--selected-stroke-color') : color;
        ctx.stroke(path);
    },
    [SymbolType.POWER_POLE]: (ctx, isSelected, color) => {
        const path = new Path2D("M18 12 a6 6 0 1 1-12 0 a6 6 0 1 1 12 0Z M12 6V18 M8 9H16 M8 15H16");
        ctx.strokeStyle = isSelected ? getComputedStyle(document.documentElement).getPropertyValue('--selected-stroke-color') : color;
        ctx.stroke(path);
    },
    [SymbolType.LAMPPOST]: (ctx, isSelected, color) => {
        const path = new Path2D("M18 12 a6 6 0 1 1-12 0 a6 6 0 1 1 12 0Z M12 6V3 M12 18V21 M6 12H3 M18 12H21");
        ctx.strokeStyle = isSelected ? getComputedStyle(document.documentElement).getPropertyValue('--selected-stroke-color') : color;
        ctx.stroke(path);
    },
    [SymbolType.DECIDUOUS_TREE]: (ctx, isSelected, color) => {
        const path = new Path2D("M20 12 a8 8 0 1 1-16 0 a8 8 0 1 1 16 0Z");
        ctx.strokeStyle = isSelected ? getComputedStyle(document.documentElement).getPropertyValue('--selected-stroke-color') : color;
        ctx.stroke(path);
    },
    [SymbolType.CONIFEROUS_TREE]: (ctx, isSelected, color) => {
        const path = new Path2D("M12 2 L15 9 L22 9 L17 14 L19 21 L12 17 L5 21 L7 14 L2 9 L9 9 Z");
        ctx.strokeStyle = isSelected ? getComputedStyle(document.documentElement).getPropertyValue('--selected-stroke-color') : color;
        ctx.stroke(path);
    },
};

/** Представляє стандартизований символ на схемі, такий як вогнегасник, вихід тощо. */
export class SymbolObject implements SceneObject {
    id: number;
    x: number;
    y: number;
    symbolType: SymbolType;
    size: number;
    angle: number;
    color: string;

    /**
     * Конструктор об'єкта-символу.
     * @param id Унікальний ідентифікатор.
     * @param x X-координата центру.
     * @param y Y-координата центру.
     * @param symbolType Тип символу з переліку SymbolType.
     */
    constructor(id: number, x: number, y: number, symbolType: SymbolType) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.symbolType = symbolType;
        this.size = 24; // Default size for symbols
        this.angle = 0;
        this.color = getComputedStyle(document.documentElement).getPropertyValue('--wall-color').trim();
    }

    /**
     * Перевіряє, чи містить об'єкт задану точку з урахуванням допуску.
     * @param point Точка для перевірки.
     * @param tolerance Допуск в світових одиницях.
     */
    contains(point: Point, tolerance: number, app?: App): boolean {
        // Use a simple bounding box check that accounts for rotation
        const halfSize = this.size / 2;
        const translatedPoint = { x: point.x - this.x, y: point.y - this.y };
        const cos = Math.cos(-this.angle);
        const sin = Math.sin(-this.angle);

        const rotatedPoint = {
            x: translatedPoint.x * cos - translatedPoint.y * sin,
            y: translatedPoint.x * sin + translatedPoint.y * cos
        };
        
        return (
            rotatedPoint.x >= -halfSize - tolerance &&
            rotatedPoint.x <= halfSize + tolerance &&
            rotatedPoint.y >= -halfSize - tolerance &&
            rotatedPoint.y <= halfSize + tolerance
        );
    }

    /**
     * Малює символ на заданому контексті canvas.
     * @param ctx Контекст для малювання.
     * @param isSelected Чи є об'єкт виділеним.
     * @param zoom Поточний рівень масштабування.
     * @param allVisibleObjects Масив усіх видимих об'єктів на сцені.
     * @param app Екземпляр головного класу додатку.
     */
    draw(ctx: CanvasRenderingContext2D, isSelected: boolean, zoom: number, allVisibleObjects: readonly SceneObject[], app: App): void {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        const scaleFactor = this.size / 24; // Assuming base symbol size is 24x24
        ctx.scale(scaleFactor, scaleFactor);
        ctx.translate(-12, -12); // Center the 24x24 symbol

        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const renderer = SYMBOL_RENDERERS[this.symbolType];
        if (renderer) {
            renderer(ctx, isSelected, this.color);
        } else {
            // Fallback for missing renderers
            ctx.fillStyle = isSelected ? 'red' : this.color;
            ctx.fillRect(0, 0, 24, 24);
        }
        ctx.restore();
    }
    
    /**
     * Розраховує чотири кутові точки прямокутного представлення символу у світових координатах.
     * @returns Масив з чотирьох точок, що представляють кути.
     */
    getRectangleCorners(): [Point, Point, Point, Point] {
        const w_half = this.size / 2;
        const h_half = this.size / 2;
        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);

        const corners = [
            { x: -w_half, y: -h_half }, { x:  w_half, y: -h_half },
            { x:  w_half, y:  h_half }, { x: -w_half, y:  h_half },
        ];

        return corners.map(p => ({
            x: this.x + p.x * cos - p.y * sin,
            y: this.y + p.x * sin + p.y * cos,
        })) as [Point, Point, Point, Point];
    }

    /**
     * Повертає габаритний прямокутник символу.
     * @param app Екземпляр головного класу додатку (не використовується, але потрібен для відповідності інтерфейсу).
     */
    getBoundingBox(app?: App): BoundingBox {
        const transformedCorners = this.getRectangleCorners();
        return {
            minX: Math.min(...transformedCorners.map(p => p.x)),
            minY: Math.min(...transformedCorners.map(p => p.y)),
            maxX: Math.max(...transformedCorners.map(p => p.x)),
            maxY: Math.max(...transformedCorners.map(p => p.y)),
        };
    }

    /**
     * Переміщує символ на задану відстань.
     * @param dx Зміщення по осі X.
     * @param dy Зміщення по осі Y.
     */
    move(dx: number, dy: number, app?: App): void {
        this.x += dx;
        this.y += dy;
    }

    /**
     * Обертає символ навколо заданого центру на вказаний кут.
     * @param angle Кут повороту в радіанах.
     * @param center Точка центру обертання.
     */
    rotate(angle: number, center: Point, app?: App): void {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const translatedX = this.x - center.x;
        const translatedY = this.y - center.y;
        this.x = center.x + translatedX * cos - translatedY * sin;
        this.y = center.y + translatedX * sin + translatedY * cos;
        this.angle += angle;
    }

    /**
     * Масштабує символ відносно заданого центру з певним коефіцієнтом.
     * @param factor Коефіцієнт масштабування.
     * @param center Точка центру масштабування.
     */
    scale(factor: number, center: Point, app?: App): void {
        const translatedX = this.x - center.x;
        const translatedY = this.y - center.y;
        this.x = center.x + translatedX * factor;
        this.y = center.y + translatedY * factor;
        this.size *= factor;
    }

    /**
     * Створює глибоку копію об'єкта.
     * @param newId Новий унікальний ідентифікатор для копії.
     */
    clone(newId: number, app?: App): SymbolObject {
        const newSymbol = new SymbolObject(newId, this.x, this.y, this.symbolType);
        newSymbol.size = this.size;
        newSymbol.angle = this.angle;
        newSymbol.color = this.color;
        return newSymbol;
    }
    
    /**
     * Повертає центральну точку символу.
     */
    getCenter(app?: App): Point {
        return { x: this.x, y: this.y };
    }

    /**
     * Повертає масив "ручок" (grips) для редагування символу.
     */
    getGrips(app?: App): Grip[] {
        const center = this.getCenter(app);
        const corners = this.getRectangleCorners();
        const grips: Grip[] = [
            { object: this, type: GripType.MOVE, point: center }
        ];

        corners.forEach((p, i) => {
            grips.push({ object: this, type: GripType.STRETCH, point: p, metadata: { pointIndex: i, center } });
        });
        
        const offset = this.size/2 + 20;
        const rotationHandlePoint = {
            x: center.x - offset * Math.sin(this.angle),
            y: center.y + offset * Math.cos(this.angle),
        };

        grips.push({
            object: this,
            type: GripType.ROTATE,
            point: rotationHandlePoint,
            metadata: { center }
        });

        return grips;
    }

    /**
     * Повертає масив точок для об'єктної прив'язки.
     */
    getSnapPoints(app?: App): Point[] {
        return [this.getCenter(app), ...this.getRectangleCorners()];
    }

    /**
     * Серіалізує об'єкт у JSON-сумісний формат.
     */
    toJSON() {
        return {
            type: 'symbol',
            id: this.id,
            x: this.x,
            y: this.y,
            symbolType: this.symbolType,
            size: this.size,
            angle: this.angle,
            color: this.color
        };
    }

    /**
     * Створює екземпляр SymbolObject з JSON-даних.
     * @param data Дані для десеріалізації.
     */
    static fromJSON(data: any): SymbolObject {
        const symbol = new SymbolObject(data.id, data.x, data.y, data.symbolType);
        symbol.size = data.size ?? 24;
        symbol.angle = data.angle ?? 0;
        symbol.color = data.color ?? getComputedStyle(document.documentElement).getPropertyValue('--wall-color').trim();
        return symbol;
    }
}
