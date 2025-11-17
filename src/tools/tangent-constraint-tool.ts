/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "../app";
import { Point } from "../scene/point";
import { Tool, ToolType } from "./tool";
import { SELECTION_TOLERANCE } from "../constants";
import { PolylineObject } from "../scene/polyline-object";
import { CircleObject } from "../scene/circle-object";
import { ArcObject } from "../scene/arc-object";
import { distance } from "../utils/geometry";
import { SceneObject } from "../scene/scene-object";

type SelectableObject = PolylineObject | CircleObject | ArcObject;
type SelectedSegment = { polyline: PolylineObject, p1: Point, p2: Point };

export class TangentConstraintTool extends Tool {
    private step = 0;
    private firstSelection: { object: SelectableObject, segment?: SelectedSegment } | null = null;
    
    /**
     * Конструктор інструменту для створення дотичних обмежень.
     * @param app Екземпляр головного класу додатку.
     */
    constructor(app: App) {
        super(app, ToolType.TANGENT_CONSTRAINT);
    }

    /**
     * Активує інструмент, скидаючи його стан.
     */
    activate(): void {
        super.activate();
        this.reset();
    }

    /**
     * Обробляє подію натискання кнопки миші для вибору об'єктів для обмеження.
     * @param point Координати у світовій системі.
     * @param event Подія MouseEvent.
     */
    async onMouseDown(point: Point, event: MouseEvent): Promise<void> {
        if (!this.app.isSketchMode || !this.app.sketchSolver) return;
        
        const target = this.findObjectAt(point);
        if (!target) return;

        if (this.step === 0) {
            this.firstSelection = target;
            this.step = 1;
        } else if (this.step === 1 && this.firstSelection) {
            if (this.firstSelection.object.id === target.object.id) return;
            this.applyConstraint(this.firstSelection, target);
            this.reset();
        }
    }

    /**
     * Застосовує обмеження дотичності до вибраних об'єктів.
     * @param sel1 Перший вибраний об'єкт.
     * @param sel2 Другий вибраний об'єкт.
     */
    private applyConstraint(sel1: { object: SelectableObject, segment?: SelectedSegment }, sel2: { object: SelectableObject, segment?: SelectedSegment }): void {
        if (!this.app.sketchSolver) return;
        const { object: obj1, segment: seg1 } = sel1;
        const { object: obj2, segment: seg2 } = sel2;
        
        this.app.sketchSolver.addTangentConstraint(obj1, obj2, seg1, seg2);
        this.app.sketchSolver.solve();
        this.app.draw();
    }

    /**
     * Знаходить об'єкт (відрізок, коло або дугу) у заданій точці.
     * @param point Точка для пошуку.
     * @returns Вибраний об'єкт та його сегмент (якщо є), або null.
     */
    private findObjectAt(point: Point): { object: SelectableObject, segment?: SelectedSegment } | null {
        const sketchObjects = this.app.sketchContext;
        const tolerance = SELECTION_TOLERANCE / this.app.canvasController.zoom;

        for (const obj of [...sketchObjects].reverse()) {
            if ((obj instanceof CircleObject || obj instanceof ArcObject) && obj.contains(point, tolerance)) {
                return { object: obj };
            }
            if (obj instanceof PolylineObject && obj.contains(point, tolerance)) {
                // Find the specific segment that was clicked
                for (let i = 0; i < obj.points.length - 1; i++) {
                    const p1 = obj.points[i];
                    const p2 = obj.points[i + 1];
                    const dx = p2.x - p1.x; const dy = p2.y - p1.y;
                    if (dx === 0 && dy === 0) continue;
                    const t = ((point.x - p1.x) * dx + (point.y - p1.y) * dy) / (dx * dx + dy * dy);
                    const clampedT = Math.max(0, Math.min(1, t));
                    const closest = { x: p1.x + clampedT * dx, y: p1.y + clampedT * dy };
                    if (distance(point, closest) <= tolerance) {
                        return { object: obj, segment: { polyline: obj, p1, p2 } };
                    }
                }
            }
        }
        return null;
    }

    /**
     * Скидає стан інструменту до початкового.
     */
    private reset(): void {
        this.step = 0;
        this.firstSelection = null;
        this.app.draw();
    }

    /**
     * Деактивує інструмент, скидаючи його стан.
     */
    deactivate(): void {
        this.reset();
        super.deactivate();
    }

    /**
     * Повертає стиль курсору для інструменту.
     */
    getCursor(): string {
        return 'crosshair';
    }
}
