/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { App } from "../app";
import { Grip } from "../grips";
import { Point } from "./point";

/**
 * Габаритний прямокутник, що описує межі об'єкта.
 */
export interface BoundingBox {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}

/**
 * Базовий інтерфейс для всіх об'єктів, що можуть існувати на сцені.
 */
export interface SceneObject {
    id: number;
    isHidden?: boolean;
    /** Перевіряє, чи містить об'єкт задану точку з урахуванням допуску. */
    contains(point: Point, tolerance: number, app?: App): boolean;
    /** Малює об'єкт на заданому контексті canvas. */
    draw(ctx: CanvasRenderingContext2D, isSelected: boolean, zoom: number, allVisibleObjects: readonly SceneObject[], app: App): void;
    /** Повертає габаритний прямокутник об'єкта. */
    getBoundingBox(app?: App): BoundingBox;
    /** Переміщує об'єкт на задану відстань. */
    move(dx: number, dy: number, app?: App): void;
    /** Обертає об'єкт навколо заданого центру на вказаний кут. */
    rotate(angle: number, center: Point, app?: App): void;
    /** Масштабує об'єкт відносно заданого центру з певним коефіцієнтом. */
    scale(factor: number, center: Point, app?: App): void;
    /** Створює глибоку копію об'єкта з новим ID. */
    clone(newId: number, app?: App): SceneObject;
    /** Повертає центральну точку об'єкта. */
    getCenter(app?: App): Point;
    /** Повертає масив точок для об'єктної прив'язки. */
    getSnapPoints(app?: App): Point[];
    /** Повертає масив "ручок" (grips) для редагування об'єкта. */
    getGrips(app?: App): Grip[];
    /** Серіалізує об'єкт у JSON-сумісний формат. */
    toJSON(): any;
}