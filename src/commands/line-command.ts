/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "../app";
import { Command } from "./command";
import { Point } from "../scene/point";
import { ToolType } from "../tools/tool";
import { OBJECT_SNAP_DISTANCE } from "../constants";
import { findClosestSnapPoint, snapToGrid, snapToAngle, snapToOrtho } from "../utils/geometry";
import { SnapResult } from "../snapping";
import { drawSnapIndicator } from "../utils/snap-indicator-drawer";
import { PolylineObject } from "../scene/polyline-object";
import { I18nService } from "../i18n";
import { SceneObject } from "../scene/scene-object";

/**
 * Інтерфейс, що визначає контракт для всіх станів команди Line.
 */
interface LineCommandState {
    onMouseDown(point: Point): void;
    onMouseMove(point: Point): void;
    onKeyDown(event: KeyboardEvent): void;
    onContextMenu(): void;
    drawOverlay(ctx: CanvasRenderingContext2D, zoom: number): void;
    activate(): void;
}

/**
 * Початковий стан: очікування першої точки.
 */
class AwaitingFirstPointState implements LineCommandState {
    constructor(private command: LineCommand) {}

    activate(): void {
        this.command.app.commandLineController.setPrompt(this.command.i18n.t('command.line.prompt.firstPoint'));
    }

    onMouseDown(point: Point): void {
        const snappedPoint = this.command.getSnappedPoint(point);
        this.command.points.push(snappedPoint);
        // Перехід до наступного стану
        this.command.state = new DrawingNextPointState(this.command);
        this.command.state.activate();
    }

    onMouseMove(point: Point): void {
        // Оновлюємо прив'язку навіть до першого кліку
        this.command.getSnappedPoint(point);
    }

    onKeyDown(event: KeyboardEvent): void {}
    onContextMenu(): void {}

    drawOverlay(ctx: CanvasRenderingContext2D, zoom: number): void {
        drawSnapIndicator(ctx, this.command.activeSnap, zoom);
    }
}

/**
 * Другий стан: малювання наступних сегментів.
 */
class DrawingNextPointState implements LineCommandState {
    constructor(private command: LineCommand) {}

    activate(): void {
        this.command.app.commandLineController.setPrompt(this.command.i18n.t('command.line.prompt.nextPoint'));
    }

    onMouseDown(point: Point): void {
        const snappedPoint = this.command.getSnappedPoint(point);
        this.command.points.push(snappedPoint);
    }

    onMouseMove(point: Point): void {
        const snappedPoint = this.command.getSnappedPoint(point);
        if (this.command.points.length > 0) {
            const prevPoint = this.command.points[this.command.points.length - 1];
            this.command.app.canvasController.setPreviewLine(prevPoint, snappedPoint);
        }
    }

    onKeyDown(event: KeyboardEvent): void {
        if (event.key === 'Enter') {
            this.command.finish();
        }
    }

    onContextMenu(): void {
        this.command.finish();
    }
    
    drawOverlay(ctx: CanvasRenderingContext2D, zoom: number): void {
        drawSnapIndicator(ctx, this.command.activeSnap, zoom);
    }
}

/**
 * Реалізація команди LINE з використанням класичного патерну "Стан".
 */
export class LineCommand implements Command {
    app: App;
    i18n: I18nService;
    type: ToolType = ToolType.POLYLINE;
    
    // Властивості, що зберігають стан команди
    public state!: LineCommandState;
    public points: Point[] = [];
    public activeSnap: SnapResult | null = null;
    
    constructor(app: App) {
        this.app = app;
        this.i18n = app.i18n;
    }
    
    start(preSelectedObjects?: SceneObject[]): void {
        this.app.setSelectedObjectIds([]); // Команда LINE не використовує попереднє виділення.
        this.points = [];
        this.activeSnap = null;
        this.state = new AwaitingFirstPointState(this);
        this.state.activate();
    }
    
    finish(): void {
        if (this.points.length >= 2) {
            const polyline = new PolylineObject(this.app.sceneService.getNextId(), this.points);
            this.app.addSceneObject(polyline);
        }
        this.cleanup();
        this.app.commandFinished();
    }
    
    cancel(): void {
        this.cleanup();
    }
    
    private cleanup(): void {
        this.points = [];
        this.activeSnap = null;
        this.app.canvasController.setPreviewLine(null);
        this.app.draw();
    }

    // --- Делегування подій поточному стану ---
    onMouseDown(point: Point, event: MouseEvent): void { this.state.onMouseDown(point); }
    onMouseMove(point: Point, event: MouseEvent): void { this.state.onMouseMove(point); }
    onKeyDown(event: KeyboardEvent): void { this.state.onKeyDown(event); }
    onContextMenu(worldPoint: Point, screenPoint: Point): void { this.state.onContextMenu(); }
    drawOverlay(ctx: CanvasRenderingContext2D, zoom: number): void { this.state.drawOverlay(ctx, zoom); }

    // --- Невикористовувані методи інтерфейсу Tool ---
    onMouseUp(point: Point, event: MouseEvent): void {}
    onKeyUp(event: KeyboardEvent): void {}
    
    // --- Методи активації/деактивації ---
    activate(): void {}
    deactivate(): void {
        this.cancel();
    }
    
    getCursor(): string {
        return 'crosshair';
    }

    /**
     * Знаходить точку з урахуванням усіх активних режимів прив'язки.
     * @param point Вхідна точка курсору.
     */
    public getSnappedPoint(point: Point): Point {
        this.activeSnap = null;
        let snappedPoint = point;

        if (this.app.isOrthoEnabled && this.points.length > 0) {
            const prevPoint = this.points[this.points.length - 1];
            snappedPoint = snapToOrtho(prevPoint, snappedPoint);
        }
        if (this.app.snapModes.size > 0) {
            const tolerance = OBJECT_SNAP_DISTANCE / this.app.canvasController.zoom;
            const snapResult = findClosestSnapPoint(snappedPoint, this.app.sceneService.objects, tolerance, this.app.snapModes);
            if (snapResult) {
                this.activeSnap = snapResult;
                return snapResult.point;
            }
        }
        if (this.app.isSnappingEnabled) {
            const gridSnapped = snapToGrid(snappedPoint);
            if (!this.app.isOrthoEnabled && this.points.length > 0) {
                const prevPoint = this.points[this.points.length - 1];
                return snapToAngle(prevPoint, gridSnapped);
            }
            return gridSnapped;
        }
        return snappedPoint;
    }
}