/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { App } from "../app";
import { Grip, GripType } from "../grips";
import { distance } from "../utils/geometry";
import { Point } from "./point";
import { BoundingBox, SceneObject } from "./scene-object";
import { calculateWallRenderSegments } from "./wall-geometry";

export enum WallType {
    EXTERIOR = 'EXTERIOR',
    INTERIOR = 'INTERIOR',
    PARTITION = 'PARTITION',
}

export const WALL_THICKNESS_MAP: Record<WallType, number> = {
    [WallType.EXTERIOR]: 20,
    [WallType.INTERIOR]: 15,
    [WallType.PARTITION]: 10,
};

export class Wall implements SceneObject {
    id: number; 
    p1: Point; 
    p2: Point;
    type: WallType;
    thickness: number;
    color: string;
    
    /**
     * Конструктор класу Wall.
     * @param id Унікальний ідентифікатор об'єкта.
     * @param p1 Початкова точка центральної лінії стіни.
     * @param p2 Кінцева точка центральної лінії стіни.
     * @param type Тип стіни (зовнішня, внутрішня, перестінок).
     */
    constructor(id: number, p1: Point, p2: Point, type: WallType = WallType.EXTERIOR) {
        this.id = id;
        this.p1 = p1;
        this.p2 = p2;
        this.type = type;
        this.thickness = WALL_THICKNESS_MAP[this.type];
        this.color = getComputedStyle(document.documentElement).getPropertyValue('--wall-color').trim();
    }

    /**
     * Встановлює новий тип стіни та оновлює її товщину.
     * @param newType Новий тип стіни.
     */
    setType(newType: WallType) {
        this.type = newType;
        this.thickness = WALL_THICKNESS_MAP[this.type];
    }

    /**
     * Повертає кут нахилу стіни в радіанах.
     */
    get angle(): number { 
        return Math.atan2(this.p2.y - this.p1.y, this.p2.x - this.p1.x); 
    }

    /**
     * Повертає довжину центральної лінії стіни.
     */
    getLength(): number {
        return distance(this.p1, this.p2);
    }

    /**
     * Розраховує чотири кутові точки прямокутного представлення стіни.
     * @returns Масив з чотирьох точок, що представляють кути.
     */
    getRectangleCorners(): [Point, Point, Point, Point] {
        const halfThickness = this.thickness / 2;
        const angle = this.angle;
        
        // The perpendicular vector components
        const offsetX = halfThickness * Math.sin(angle);
        const offsetY = halfThickness * Math.cos(angle);

        const c1 = { x: this.p1.x + offsetX, y: this.p1.y - offsetY };
        const c2 = { x: this.p2.x + offsetX, y: this.p2.y - offsetY };
        const c3 = { x: this.p2.x - offsetX, y: this.p2.y + offsetY };
        const c4 = { x: this.p1.x - offsetX, y: this.p1.y + offsetY };

        return [c1, c2, c3, c4];
    }

    /**
     * Перевіряє, чи містить стіна задану точку з урахуванням допуску.
     * @param point Точка для перевірки.
     * @param tolerance Допуск в світових одиницях.
     */
    contains(point: Point, tolerance: number, app?: App): boolean {
        const dx = this.p2.x - this.p1.x;
        const dy = this.p2.y - this.p1.y;
        if (dx === 0 && dy === 0) return distance(point, this.p1) <= tolerance;
        const t = ((point.x - this.p1.x) * dx + (point.y - this.p1.y) * dy) / (dx * dx + dy * dy);
        const clampedT = Math.max(0, Math.min(1, t));
        const closestPoint = { x: this.p1.x + clampedT * dx, y: this.p1.y + clampedT * dy };
        return distance(point, closestPoint) <= tolerance + this.thickness / 2;
    }

    /**
     * Малює заливку стіни. Використовується для створення "вирізів" під двері та вікна.
     * @param ctx Контекст для малювання.
     */
    public drawFill(ctx: CanvasRenderingContext2D): void {
        const isExport = ctx.canvas.id !== 'app-canvas';
        const bgColor = isExport 
            ? '#FFFFFF' 
            : getComputedStyle(document.documentElement).getPropertyValue('--background-color');
        
        const corners = this.getRectangleCorners();
        const [c1, c2, c3, c4] = corners;
    
        ctx.beginPath();
        ctx.moveTo(c1.x, c1.y);
        ctx.lineTo(c2.x, c2.y);
        ctx.lineTo(c3.x, c3.y);
        ctx.lineTo(c4.x, c4.y);
        ctx.closePath();
        ctx.fillStyle = bgColor;
        ctx.fill();
    }
    
    /**
     * Малює контури стіни, враховуючи перетини з іншими стінами.
     * @param ctx Контекст для малювання.
     * @param isSelected Чи є об'єкт виділеним.
     * @param zoom Поточний рівень масштабування.
     * @param allVisibleObjects Масив усіх видимих об'єктів для розрахунку перетинів.
     * @param app Екземпляр головного класу додатку.
     */
    public drawStroke(ctx: CanvasRenderingContext2D, isSelected: boolean, zoom: number, allVisibleObjects: readonly SceneObject[] | undefined, app: App): void {
        const isExport = ctx.canvas.id !== 'app-canvas';
        const selectedColor = getComputedStyle(document.documentElement).getPropertyValue('--selected-stroke-color');
        
        ctx.strokeStyle = isSelected ? selectedColor : this.color;
        ctx.lineWidth = isExport ? 2 : 1 / zoom;
    
        const otherWalls = allVisibleObjects?.filter(obj => obj instanceof Wall && obj.id !== this.id) as Wall[];
    
        if (otherWalls && otherWalls.length > 0) {
            const renderSegments = calculateWallRenderSegments(this, otherWalls);
            ctx.beginPath();
            renderSegments.forEach(segment => {
                ctx.moveTo(segment[0].x, segment[0].y);
                ctx.lineTo(segment[1].x, segment[1].y);
            });
            ctx.stroke();
        } else {
            // Fallback for drawing a single wall without context
            const corners = this.getRectangleCorners();
            const [c1, c2, c3, c4] = corners;
            ctx.beginPath();
            ctx.moveTo(c1.x, c1.y);
            ctx.lineTo(c2.x, c2.y);
            ctx.lineTo(c3.x, c3.y);
            ctx.lineTo(c4.x, c4.y);
            ctx.closePath();
            ctx.stroke();
        }
    }

    /**
     * Малює об'єкт "Стіна" (заливку та контур).
     * @param ctx Контекст для малювання.
     * @param isSelected Чи є об'єкт виділеним.
     * @param zoom Поточний рівень масштабування.
     * @param allVisibleObjects Масив усіх видимих об'єктів.
     * @param app Екземпляр головного класу додатку.
     */
    draw(ctx: CanvasRenderingContext2D, isSelected: boolean, zoom: number, allVisibleObjects: readonly SceneObject[], app: App): void {
        // For compatibility with previews etc. that just call .draw()
        this.drawFill(ctx);
        this.drawStroke(ctx, isSelected, zoom, allVisibleObjects, app);
    }

    /**
     * Повертає габаритний прямокутник стіни.
     */
    getBoundingBox(app?: App): BoundingBox {
        const corners = this.getRectangleCorners();
        const allX = corners.map(p => p.x);
        const allY = corners.map(p => p.y);
        return {
            minX: Math.min(...allX),
            minY: Math.min(...allY),
            maxX: Math.max(...allX),
            maxY: Math.max(...allY),
        };
    }

    /**
     * Переміщує стіну на задану відстань.
     * @param dx Зміщення по осі X.
     * @param dy Зміщення по осі Y.
     */
    move(dx: number, dy: number, app?: App): void {
        this.p1.x += dx;
        this.p1.y += dy;
        this.p2.x += dx;
        this.p2.y += dy;
    }
    
    /**
     * Повертає центральну точку стіни.
     */
    getCenter(app?: App): Point {
        return {
            x: (this.p1.x + this.p2.x) / 2,
            y: (this.p1.y + this.p2.y) / 2
        };
    }

    /**
     * Повертає масив "ручок" (grips) для редагування стіни.
     */
    getGrips(app?: App): Grip[] {
        const center = this.getCenter(app);
        const corners = this.getRectangleCorners();
        
        return [
            { object: this, type: GripType.MOVE, point: center },
            { object: this, type: GripType.STRETCH, point: this.p1, metadata: { endpoint: 'p1' } },
            { object: this, type: GripType.STRETCH, point: this.p2, metadata: { endpoint: 'p2' } },
            { object: this, type: GripType.STRETCH, point: corners[0], metadata: { isCorner: true } },
            { object: this, type: GripType.STRETCH, point: corners[1], metadata: { isCorner: true } },
            { object: this, type: GripType.STRETCH, point: corners[2], metadata: { isCorner: true } },
            { object: this, type: GripType.STRETCH, point: corners[3], metadata: { isCorner: true } },
        ];
    }

    /**
     * Повертає масив точок для об'єктної прив'язки.
     */
    getSnapPoints(app?: App): Point[] {
        return [this.p1, this.p2, this.getCenter(app), ...this.getRectangleCorners()];
    }

    /**
     * Обертає стіну навколо заданого центру на вказаний кут.
     * @param angle Кут повороту в радіанах.
     * @param center Точка центру обертання.
     */
    rotate(angle: number, center: Point, app?: App): void {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const rotatePoint = (p: Point) => {
            const translatedX = p.x - center.x;
            const translatedY = p.y - center.y;
            p.x = center.x + translatedX * cos - translatedY * sin;
            p.y = center.y + translatedX * sin + translatedY * cos;
        };

        rotatePoint(this.p1);
        rotatePoint(this.p2);
    }

    /**
     * Масштабує стіну відносно заданого центру з певним коефіцієнтом.
     * @param factor Коефіцієнт масштабування.
     * @param center Точка центру масштабування.
     */
    scale(factor: number, center: Point, app?: App): void {
        const scalePoint = (p: Point) => {
            const translatedX = p.x - center.x;
            const translatedY = p.y - center.y;
            p.x = center.x + translatedX * factor;
            p.y = center.y + translatedY * factor;
        };
        scalePoint(this.p1);
        scalePoint(this.p2);
        this.thickness *= factor;
    }

    /**
     * Створює глибоку копію об'єкта.
     * @param newId Новий унікальний ідентифікатор для копії.
     */
    clone(newId: number, app?: App): Wall {
        const newWall = new Wall(newId, { ...this.p1 }, { ...this.p2 }, this.type);
        newWall.thickness = this.thickness;
        newWall.color = this.color;
        return newWall;
    }

    /**
     * Серіалізує об'єкт у JSON-сумісний формат.
     */
    toJSON() {
        return {
            type: 'wall',
            id: this.id,
            p1: this.p1,
            p2: this.p2,
            wallType: this.type, // Use a unique name to avoid conflict with object 'type'
            thickness: this.thickness,
            color: this.color
        };
    }

    /**
     * Створює екземпляр Wall з JSON-даних.
     * @param data Дані для десеріалізації.
     */
    static fromJSON(data: any): Wall {
        const wallType = data.wallType ?? WallType.EXTERIOR;
        const wall = new Wall(data.id, data.p1, data.p2, wallType);
        // Thickness is set by type, but allow override from old files
        wall.thickness = data.thickness ?? WALL_THICKNESS_MAP[wallType];
        wall.color = data.color ?? getComputedStyle(document.documentElement).getPropertyValue('--wall-color').trim();
        return wall;
    }
}
