/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "../app";
import { OBJECT_SNAP_DISTANCE } from "../constants";
import { Point } from "../scene/point";
import { Wall, WallType } from "../scene/wall";
import { snapToGrid, snapToAngle, findClosestSnapPoint, snapToOrtho, distance } from "../utils/geometry";
import { Tool, ToolType } from "./tool";
import { SnapResult } from "../snapping";
import { drawSnapIndicator } from "../utils/snap-indicator-drawer";

export class WallTool extends Tool {
    private isDrawing = false;
    private drawingStartPoint: Point | null = null;
    public selectedWallType: WallType = WallType.EXTERIOR; // Default type
    private activeSnap: SnapResult | null = null;
    private currentMousePosition: Point = { x: 0, y: 0 };
    
    /**
     * Конструктор інструменту для створення стін.
     * @param app Екземпляр головного класу додатку.
     */
    constructor(app: App) {
        super(app, ToolType.WALL);
    }

    /**
     * Повертає точку з урахуванням усіх активних режимів прив'язки.
     * @param point Вхідна точка (зазвичай від курсору).
     * @param contextPoint Контекстна точка для прив'язки (наприклад, початок лінії).
     */
    private getSnappedPoint(point: Point, contextPoint?: Point): Point {
        this.activeSnap = null;
        this.app.canvasController.guideLines = [];
        let snappedPoint = point;

        // 1. Ortho constraint
        if (this.app.isOrthoEnabled && contextPoint) {
            snappedPoint = snapToOrtho(contextPoint, snappedPoint);
        }

        // 2. Object snapping
        if (this.app.snapModes.size > 0) {
            const tolerance = OBJECT_SNAP_DISTANCE / this.app.canvasController.zoom;
            // FIX: Use sceneService to access objects.
            const snapResult = findClosestSnapPoint(snappedPoint, this.app.sceneService.objects, tolerance, this.app.snapModes, undefined, contextPoint);
            if (snapResult) {
                this.activeSnap = snapResult;
                return snapResult.point;
            }
        }

        // 3. Axial (guide line) snap
        if (this.isDrawing && this.drawingStartPoint) {
            const tolerance = 5 / this.app.canvasController.zoom;
            // FIX: Use sceneService to access objects.
            const staticSnapPoints = this.app.sceneService.objects.flatMap(o => o.getSnapPoints(this.app));
            let xSnapped = false;
            let ySnapped = false;

            for (const sp of staticSnapPoints) {
                if (!xSnapped && Math.abs(snappedPoint.x - sp.x) < tolerance) {
                    snappedPoint.x = sp.x;
                    this.app.canvasController.guideLines.push({ p1: sp, p2: snappedPoint });
                    xSnapped = true;
                }
                if (!ySnapped && Math.abs(snappedPoint.y - sp.y) < tolerance) {
                    snappedPoint.y = sp.y;
                    this.app.canvasController.guideLines.push({ p1: sp, p2: snappedPoint });
                    ySnapped = true;
                }
                if (xSnapped && ySnapped) break;
            }
        }
        
        // 4. Grid and Angle snapping (lowest priority)
        if (this.app.isSnappingEnabled) {
            let gridSnapped = snapToGrid(snappedPoint);
            if (!this.app.isOrthoEnabled && contextPoint) {
                return snapToAngle(contextPoint, gridSnapped);
            }
            return gridSnapped;
        }
        
        return snappedPoint;
    }

    /**
     * Обробляє натискання кнопки миші для початку або завершення малювання сегмента стіни.
     * @param point Координати у світовій системі.
     * @param event Подія MouseEvent.
     */
    onMouseDown(point: Point, event: MouseEvent): void {
        const snappedPoint = this.getSnappedPoint(point, this.drawingStartPoint || undefined);
        if (!this.isDrawing) {
            this.isDrawing = true;
            this.drawingStartPoint = snappedPoint;
            this.app.coordinateInputController.show(
                event.clientX,
                event.clientY,
                this.handleCoordinateInputCommit.bind(this)
            );
        } else if (this.drawingStartPoint) {
            this.finalizeWall(snappedPoint);
            this.drawingStartPoint = snappedPoint;
            this.app.canvasController.setPreviewLine(this.drawingStartPoint, snappedPoint);
        }
    }
    
    /**
     * Обробляє рух миші для оновлення попереднього перегляду стіни.
     * @param point Координати у світовій системі.
     * @param event Подія MouseEvent.
     */
    onMouseMove(point: Point, event: MouseEvent): void {
        this.currentMousePosition = point;
        const snappedPoint = this.getSnappedPoint(point, this.drawingStartPoint || undefined);
        if (this.isDrawing && this.drawingStartPoint) {
            this.app.canvasController.setPreviewLine(this.drawingStartPoint, snappedPoint);
            const currentLength = distance(this.drawingStartPoint, snappedPoint);
            this.app.coordinateInputController.updateLength(currentLength);
            this.app.coordinateInputController.updatePosition(event.clientX, event.clientY);
        }
    }

    /**
     * Обробляє контекстне меню (права кнопка миші) для завершення малювання.
     * @param worldPoint Координати у світовій системі.
     * @param screenPoint Координати в екранній системі.
     */
    onContextMenu(worldPoint: Point, screenPoint: Point): void {
        if (this.isDrawing) {
            this.deactivate();
            this.app.setActiveTool(ToolType.SELECT);
        }
    }

    /**
     * Обробляє введення довжини з координатного поля.
     * @param length Введена довжина.
     */
    private handleCoordinateInputCommit(length: number): void {
        if (!this.isDrawing || !this.drawingStartPoint) return;

        const angle = Math.atan2(
            this.currentMousePosition.y - this.drawingStartPoint.y,
            this.currentMousePosition.x - this.drawingStartPoint.x
        );

        const endPoint = {
            x: this.drawingStartPoint.x + length * Math.cos(angle),
            y: this.drawingStartPoint.y + length * Math.sin(angle)
        };

        this.finalizeWall(endPoint);

        this.drawingStartPoint = endPoint;
        this.app.canvasController.setPreviewLine(this.drawingStartPoint, this.currentMousePosition);
    }

    /**
     * Створює та додає на сцену фінальний об'єкт стіни.
     * @param endPoint Кінцева точка стіни.
     */
    private finalizeWall(endPoint: Point): void {
        if (!this.drawingStartPoint) return;
        // Don't create zero-length walls
        if (endPoint.x === this.drawingStartPoint.x && endPoint.y === this.drawingStartPoint.y) {
            return;
        }
        // FIX: Use sceneService to get the next object ID.
        const wall = new Wall(this.app.sceneService.getNextId(), this.drawingStartPoint, endPoint, this.selectedWallType);
        this.app.addSceneObject(wall);
    }
    
    /**
     * Деактивує інструмент, скидаючи його стан.
     */
    deactivate(): void {
        this.isDrawing = false;
        this.drawingStartPoint = null;
        this.activeSnap = null;
        this.app.canvasController.setPreviewLine(null);
        this.app.coordinateInputController.hide();
        this.app.canvasController.guideLines = [];
        this.app.draw();
    }
    
    /**
     * Малює індикатор прив'язки.
     * @param ctx Контекст для малювання.
     * @param zoom Поточний рівень масштабування.
     */
    drawOverlay(ctx: CanvasRenderingContext2D, zoom: number): void {
        drawSnapIndicator(ctx, this.activeSnap, zoom);
    }

    /**
     * Повертає стиль курсору для інструменту.
     */
    getCursor(): string {
        return 'crosshair';
    }
}
