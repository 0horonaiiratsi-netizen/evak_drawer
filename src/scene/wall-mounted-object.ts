/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "../app";
import { Grip, GripType } from "../grips";
import { Point } from "./point";
import { BoundingBox, SceneObject } from "./scene-object";

export abstract class WallMountedObject implements SceneObject {
    id: number; 
    x: number; 
    y: number; 
    width: number; 
    height: number; 
    angle: number;

    /**
     * Конструктор абстрактного класу для об'єктів, що розміщуються на стінах (двері, вікна).
     * @param id Унікальний ідентифікатор.
     * @param x X-координата центру.
     * @param y Y-координата центру.
     * @param width Ширина об'єкта.
     * @param height Висота (товщина) об'єкта.
     * @param angle Кут повороту в радіанах.
     */
    constructor(id: number, x: number, y: number, width: number, height: number, angle: number) {
        this.id = id; this.x = x; this.y = y; this.width = width; this.height = height; this.angle = angle;
    }

    /**
     * Перевіряє, чи містить об'єкт задану точку з урахуванням допуску.
     * @param point Точка для перевірки.
     * @param tolerance Допуск в світових одиницях.
     */
    contains(point: Point, tolerance: number, app?: App): boolean {
        // Inverse transform the point to the object's local coordinate system
        const translatedPoint = { x: point.x - this.x, y: point.y - this.y };
        const cos = Math.cos(-this.angle);
        const sin = Math.sin(-this.angle);

        const rotatedPoint = {
            x: translatedPoint.x * cos - translatedPoint.y * sin,
            y: translatedPoint.x * sin + translatedPoint.y * cos
        };
        
        // AABB (Axis-Aligned Bounding Box) check in local space
        return (
            rotatedPoint.x >= -this.width / 2 - tolerance &&
            rotatedPoint.x <= this.width / 2 + tolerance &&
            rotatedPoint.y >= -this.height / 2 - tolerance &&
            rotatedPoint.y <= this.height / 2 + tolerance
        );
    }

    /**
     * Розраховує чотири кутові точки прямокутного представлення об'єкта у світових координатах.
     * @returns Масив з чотирьох точок, що представляють кути.
     */
    getRectangleCorners(): [Point, Point, Point, Point] {
        const w = this.width;
        const h = this.height;
        const angle = this.angle;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const corners = [
            { x: -w / 2, y: -h / 2 },
            { x:  w / 2, y: -h / 2 },
            { x:  w / 2, y:  h / 2 },
            { x: -w / 2, y:  h / 2 },
        ];

        const transformedCorners = corners.map(p => ({
            x: (p.x * cos - p.y * sin) + this.x,
            y: (p.x * sin + p.y * cos) + this.y,
        }));
        
        return [transformedCorners[0], transformedCorners[1], transformedCorners[2], transformedCorners[3]];
    }

    /**
     * Повертає габаритний прямокутник об'єкта.
     */
    getBoundingBox(app?: App): BoundingBox {
        const transformedCorners = this.getRectangleCorners();
        const minX = Math.min(...transformedCorners.map(p => p.x));
        const minY = Math.min(...transformedCorners.map(p => p.y));
        const maxX = Math.max(...transformedCorners.map(p => p.x));
        const maxY = Math.max(...transformedCorners.map(p => p.y));

        return { minX, minY, maxX, maxY };
    }

    /**
     * Переміщує об'єкт на задану відстань.
     * @param dx Зміщення по осі X.
     * @param dy Зміщення по осі Y.
     */
    move(dx: number, dy: number, app?: App): void {
        this.x += dx;
        this.y += dy;
    }
    
    /**
     * Повертає центральну точку об'єкта.
     */
    getCenter(app?: App): Point {
        return { x: this.x, y: this.y };
    }

    /**
     * Повертає масив точок для об'єктної прив'язки.
     */
    getSnapPoints(app?: App): Point[] {
        return [this.getCenter(app), ...this.getRectangleCorners()];
    }

    /**
     * Повертає масив "ручок" (grips) для редагування об'єкта.
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
        
        const offset = this.height / 2 + 20;
        const rotationHandlePoint = {
            x: center.x + offset * Math.sin(this.angle),
            y: center.y - offset * Math.cos(this.angle),
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
     * Обертає об'єкт навколо заданого центру на вказаний кут.
     * @param angle Кут повороту в радіанах.
     * @param center Точка центру обертання.
     */
    rotate(angle: number, center: Point, app?: App): void {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        // Translate point to origin, rotate, then translate back
        const translatedX = this.x - center.x;
        const translatedY = this.y - center.y;
        this.x = center.x + translatedX * cos - translatedY * sin;
        this.y = center.y + translatedX * sin + translatedY * cos;
        
        // Add the rotation to the object's own angle
        this.angle += angle;
    }

    /**
     * Масштабує об'єкт відносно заданого центру з певним коефіцієнтом.
     * @param factor Коефіцієнт масштабування.
     * @param center Точка центру масштабування.
     */
    scale(factor: number, center: Point, app?: App): void {
        const translatedX = this.x - center.x;
        const translatedY = this.y - center.y;
        this.x = center.x + translatedX * factor;
        this.y = center.y + translatedY * factor;

        this.width *= factor;
        this.height *= factor;
    }

    abstract draw(ctx: CanvasRenderingContext2D, isSelected: boolean, zoom: number, allVisibleObjects: readonly SceneObject[], app: App): void;
    abstract clone(newId: number, app?: App): SceneObject;
    abstract toJSON(): any;
}
