/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "../app";
import { Point } from "../scene/point";
import { Tool, ToolType } from "./tool";
import { SELECTION_TOLERANCE, OBJECT_SNAP_DISTANCE } from "../constants";
import { SceneObject } from "../scene/scene-object";
import { distance, findClosestSnapPoint, snapToOrtho } from "../utils/geometry";
import { Grip, GripAction, GripType } from "../grips";
import { drawGrip } from "../utils/grip-drawer";
import { objectFactory } from "../scene/factory";
import { GroupObject } from "../scene/group-object";
import { SnapResult } from "../snapping";
import { drawSnapIndicator } from "../utils/snap-indicator-drawer";
import { Wall } from "../scene/wall";
import { PolylineObject } from "../scene/polyline-object";

type SelectToolState =
    | { name: 'IDLE' }
    | { name: 'MARQUEE_SELECTING', startPoint: Point, endPoint: Point }
    | { 
        name: 'DRAGGING_OBJECTS', 
        startPoint: Point,
        initialObjectStates: Map<number, string>,
        hasMoved: boolean 
      }
    | { 
        name: 'GRIP_HOT', 
        activeGrip: Grip,
        initialObjectStates: Map<number, string>, // Map<objectId, JSON string>
        initialSelectionCenter: Point,
        currentAction: GripAction,
        availableActions: GripAction[],
        actionIndex: number,
      };

export class SelectTool extends Tool {
    private state: SelectToolState = { name: 'IDLE' };
    private hoveredGrip: Grip | null = null;
    private hoveredObject: SceneObject | null = null;
    private activeSnap: SnapResult | null = null;
    
    /**
     * Конструктор інструменту для виділення та редагування.
     * @param app Екземпляр головного класу додатку.
     */
    constructor(app: App) {
        super(app, ToolType.SELECT);
    }
    
    /**
     * Повертає всі "ручки" (grips) для поточного виділення.
     */
    private getGripsForSelection(): Grip[] {
        const objects = this.app.isSketchMode ? this.app.sketchContext :
                        this.app.groupEditContext ? this.app.groupEditContext.objects : 
                        // FIX: Use sceneService to access objects.
                        this.app.sceneService.objects;
        
        const selectedObjects = objects.filter(obj => this.app.selectionService.selectedIds.includes(obj.id));
        
        let allGrips: Grip[] = [];
        for (const obj of selectedObjects) {
            // FIX: Use layerService to get the layer for an object.
            const layer = this.app.layerService.getLayerForObject(obj.id);
            if (!layer?.isLocked) {
                allGrips.push(...obj.getGrips(this.app));
            }
        }
        return allGrips;
    }
    
    /**
     * Знаходить "ручку" (grip) у заданій точці.
     * @param worldPoint Координати для пошуку.
     */
    private findGripAt(worldPoint: Point): Grip | null {
        const grips = this.getGripsForSelection();
        const tolerance = 8 / this.app.canvasController.zoom; 

        for (const grip of grips) {
            if (distance(worldPoint, grip.point) < tolerance) {
                return grip;
            }
        }
        return null;
    }

    /**
     * Повертає точку з урахуванням усіх активних режимів прив'язки.
     * @param point Вхідна точка (зазвичай від курсору).
     */
    private getSnappedPoint(point: Point): Point {
        this.activeSnap = null;
        let snappedPoint = point; // Start with the raw mouse position.
    
        // 1. Apply Ortho snapping if conditions are met.
        if (this.app.isOrthoEnabled && this.state.name === 'GRIP_HOT') {
            const { activeGrip, currentAction } = this.state;
    
            if (currentAction === 'STRETCH' && activeGrip.object instanceof Wall && activeGrip.metadata?.endpoint) {
                const wall = activeGrip.object;
                const contextPoint = activeGrip.metadata.endpoint === 'p1' ? wall.p2 : wall.p1;
                snappedPoint = snapToOrtho(contextPoint, snappedPoint);
            }
        }
    
        // 2. Apply Object snapping to the (potentially) ortho-snapped point.
        const objectToExclude = this.state.name === 'GRIP_HOT' ? this.state.activeGrip.object : undefined;
        if (this.app.snapModes.size > 0) {
            const tolerance = OBJECT_SNAP_DISTANCE / this.app.canvasController.zoom;
            const snapResult = findClosestSnapPoint(
                snappedPoint, // Use the modified point
                // FIX: Use sceneService to access objects.
                this.app.sceneService.objects,
                tolerance,
                this.app.snapModes,
                objectToExclude
            );
    
            if (snapResult) {
                this.activeSnap = snapResult;
                return snapResult.point; // Object snap has the highest priority.
            }
        }
        
        return snappedPoint;
    }

    /**
     * Обробляє подію натискання кнопки миші.
     * @param point Координати у світовій системі.
     * @param event Подія MouseEvent.
     */
    onMouseDown(point: Point, event: MouseEvent): void {
        if (this.state.name === 'GRIP_HOT') {
            this.finalizeGripAction(point);
            return;
        }

        const grip = this.findGripAt(point);
        if (grip) {
            this.activateGrip(grip);
            return;
        }

        const tolerance = SELECTION_TOLERANCE / this.app.canvasController.zoom;
        const objectsToCheck = this.app.isSketchMode ? this.app.sketchContext :
                               this.app.groupEditContext ? this.app.groupEditContext.objects : 
                               // FIX: Use sceneService to get visible objects.
                               this.app.sceneService.getVisibleObjectsSortedForRender();

        const clickedObject = [...objectsToCheck]
            .reverse()
            .find(obj => {
                // FIX: Use layerService to get the layer for an object.
                const layer = this.app.layerService.getLayerForObject(this.app.groupEditContext?.id ?? obj.id);
                return (!layer || !layer.isLocked) && obj.contains(point, tolerance, this.app);
            });
            
        if (clickedObject) {
            if (event.shiftKey) {
                const currentIds = new Set(this.app.selectionService.selectedIds);
                if (currentIds.has(clickedObject.id)) {
                    currentIds.delete(clickedObject.id);
                } else {
                    currentIds.add(clickedObject.id);
                }
                this.app.selectionService.set(Array.from(currentIds));
            } else if (!this.app.selectionService.selectedIds.includes(clickedObject.id)) {
                this.app.selectionService.set([clickedObject.id]);
            }

            const initialStates = new Map<number, string>();
            // FIX: Use sceneService to access objects.
            const objectsSource = this.app.groupEditContext ? this.app.groupEditContext.objects : this.app.sceneService.objects;
            const objectsToDrag = objectsSource.filter(obj => this.app.selectionService.selectedIds.includes(obj.id));
            objectsToDrag.forEach(obj => {
                initialStates.set(obj.id, JSON.stringify(obj.toJSON()));
            });

            this.state = {
                name: 'DRAGGING_OBJECTS',
                startPoint: point,
                initialObjectStates: initialStates,
                hasMoved: false
            };
        } else {
            if (!event.shiftKey) {
                this.app.selectionService.set([]);
            }
            this.state = { name: 'MARQUEE_SELECTING', startPoint: point, endPoint: point };
        }
    }

    /**
     * Починає виконання дії з "ручкою" (grip) з контекстного меню.
     * @param grip "Ручка", для якої виконується дія.
     * @param action Дія, яку потрібно виконати.
     */
    public startGripAction(grip: Grip, action: GripAction) {
        const availableActions = this.getAvailableActionsForGrip(grip);
        if (!availableActions.includes(action)) { return; }

        // Handle reference-based actions by activating the corresponding tool
        if (action === 'ROTATE_BY_REF') {
            this.app.setActiveTool(ToolType.ROTATE_BY_REFERENCE);
            const rotateTool = this.app.getTool(ToolType.ROTATE_BY_REFERENCE) as any;
            if (rotateTool && typeof rotateTool.activateFromGrip === 'function') {
                rotateTool.activateFromGrip(grip);
            }
            return;
        } else if (action === 'SCALE_BY_REF') {
            this.app.setActiveTool(ToolType.SCALE_BY_REFERENCE);
            const scaleTool = this.app.getTool(ToolType.SCALE_BY_REFERENCE) as any;
            if (scaleTool && typeof scaleTool.activateFromGrip === 'function') {
                scaleTool.activateFromGrip(grip);
            }
            return;
        }

        const initialStates = new Map<number, string>();
        // FIX: Use sceneService to access objects.
        const objectsSource = this.app.isSketchMode ? this.app.sketchContext : this.app.sceneService.objects;
        const selectedObjects = objectsSource.filter(o => this.app.selectionService.selectedIds.includes(o.id));
        selectedObjects.forEach(obj => { initialStates.set(obj.id, JSON.stringify(obj.toJSON())); });
        const initialSelectionCenter = new GroupObject(0, selectedObjects).getCenter(this.app);

        const actionIndex = availableActions.indexOf(action);

        this.state = {
            name: 'GRIP_HOT',
            activeGrip: grip,
            initialObjectStates: initialStates,
            initialSelectionCenter: initialSelectionCenter,
            availableActions: availableActions,
            actionIndex: actionIndex,
            currentAction: action,
        };
        this.updateCommandStatus();
        this.app.draw();
    }

    /**
     * Активує "гарячу" "ручку" (grip) при натисканні на неї.
     * @param grip "Ручка", яку потрібно активувати.
     */
    private activateGrip(grip: Grip) {
        if (this.app.isSketchMode && this.app.sketchSolver) {
            if (grip.object instanceof PolylineObject && typeof grip.metadata?.pointIndex === 'number') {
                const pointToEdit = grip.object.points[grip.metadata.pointIndex];
                if (pointToEdit) {
                    this.app.sketchSolver.startEdit(pointToEdit);
                }
            }
        }
        
        const availableActions = this.getAvailableActionsForGrip(grip);
        const initialStates = new Map<number, string>();
        // FIX: Use sceneService to access objects.
        const objectsSource = this.app.isSketchMode ? this.app.sketchContext : this.app.sceneService.objects;
        const selectedObjects = objectsSource.filter(o => this.app.selectionService.selectedIds.includes(o.id));
        selectedObjects.forEach(obj => { initialStates.set(obj.id, JSON.stringify(obj.toJSON())); });
        const initialSelectionCenter = new GroupObject(0, selectedObjects).getCenter(this.app);

        this.state = {
            name: 'GRIP_HOT',
            activeGrip: grip,
            initialObjectStates: initialStates,
            initialSelectionCenter: initialSelectionCenter,
            availableActions: availableActions,
            actionIndex: 0,
            currentAction: availableActions[0],
        };
        this.updateCommandStatus();
    }

    /**
     * Повертає масив доступних дій для заданої "ручки".
     * @param grip "Ручка" для перевірки.
     */
    private getAvailableActionsForGrip(grip: Grip): GripAction[] {
        if (this.app.isSketchMode) {
            // In sketch mode, only STRETCH is supported for vertices
            if (grip.object instanceof PolylineObject && typeof grip.metadata?.pointIndex === 'number') {
                return ['STRETCH'];
            }
            return [];
        }

        if (grip.object instanceof Wall && grip.metadata?.isCorner) {
            return ['MOVE'];
        }

        switch (grip.type) {
            case GripType.STRETCH:
                return ['STRETCH', 'MOVE', 'ROTATE', 'SCALE'];
            case GripType.MOVE:
                return ['MOVE'];
            case GripType.ROTATE:
                return ['ROTATE', 'ROTATE_BY_REF'];
            case GripType.SCALE:
                return ['SCALE', 'SCALE_BY_REF'];
            case GripType.ROTATE_BY_REF:
                return ['ROTATE_BY_REF'];
            case GripType.SCALE_BY_REF:
                return ['SCALE_BY_REF'];
            default:
                return [];
        }
    }

    /**
     * Оновлює повідомлення в командному рядку відповідно до поточної дії з "ручкою".
     */
    private updateCommandStatus() {
        if (this.state.name === 'GRIP_HOT') {
            let statusMessage: string;
            switch(this.state.currentAction) {
                case 'STRETCH': statusMessage = 'РОЗТЯГНУТИ'; break;
                case 'MOVE': statusMessage = 'ПЕРЕМІСТИТИ'; break;
                case 'ROTATE': statusMessage = 'ОБЕРТАТИ'; break;
                case 'SCALE': statusMessage = 'МАСШТАБУВАТИ'; break;
                case 'ROTATE_BY_REF': statusMessage = 'ОБЕРТАТИ ПО РЕФЕРЕНЦУ'; break;
                case 'SCALE_BY_REF': statusMessage = 'МАСШТАБУВАТИ ПО РЕФЕРЕНЦУ'; break;
                default: statusMessage = this.state.currentAction;
            }
            this.app.commandLineController.setPrompt(`** ${statusMessage} **`);
        } else {
            this.app.commandLineController.showDefaultPrompt();
        }
    }
    
    /**
     * Обробляє подію натискання клавіші на клавіатурі.
     * @param event Подія KeyboardEvent.
     */
    onKeyDown(event: KeyboardEvent): void {
        if (event.key === 'Escape') {
            if (this.state.name === 'DRAGGING_OBJECTS') {
                this.reset();
                this.app.draw();
                event.preventDefault();
                return;
            }
            if (this.state.name === 'GRIP_HOT') {
                this.cancelGripAction();
                event.preventDefault();
            }
        }

        if (this.state.name === 'GRIP_HOT' && (event.key === ' ' || event.key === 'Enter')) {
            this.cycleGripAction();
            event.preventDefault();
        }
    }

    /**
     * Перемикає поточну дію для "гарячої" "ручки" на наступну доступну.
     */
    private cycleGripAction() {
        if (this.state.name !== 'GRIP_HOT' || this.app.isSketchMode) return;
        
        const newIndex = (this.state.actionIndex + 1) % this.state.availableActions.length;
        this.state.actionIndex = newIndex;
        this.state.currentAction = this.state.availableActions[newIndex];
        
        this.updateCommandStatus();
        this.app.draw(); // Redraw to update preview for new action
    }

    /**
     * Скасовує поточну дію з "ручкою" та повертає об'єкти до початкового стану.
     */
    private cancelGripAction() {
        if (this.state.name !== 'GRIP_HOT') return;
        const state = this.state;
        
        if (this.app.isSketchMode && this.app.sketchSolver) {
            if (state.activeGrip.object instanceof PolylineObject && typeof state.activeGrip.metadata?.pointIndex === 'number') {
                const pointToEdit = state.activeGrip.object.points[state.activeGrip.metadata.pointIndex];
                if (pointToEdit) {
                    this.app.sketchSolver.endEdit(pointToEdit);
                }
            }
        }

        // FIX: Use sceneService to access objects.
        const objectsSource = this.app.isSketchMode ? this.app.sketchContext : this.app.sceneService.objects;
        state.initialObjectStates.forEach((jsonState, id) => {
            const obj = objectsSource.find(o => o.id === id);
            const data = JSON.parse(jsonState);
            const factory = objectFactory[data.type as keyof typeof objectFactory];
            if (obj && factory) {
                const restoredObj = factory(data, this.app);
                Object.assign(obj, restoredObj);
            }
        });
        
        this.reset();
        this.app.draw();
    }

    /**
     * Завершує дію з "ручкою", застосовуючи фінальну трансформацію.
     * @param point Фінальна точка курсору.
     */
    private finalizeGripAction(point: Point) {
        if (this.state.name !== 'GRIP_HOT') return;
        const state = this.state;
    
        if (this.app.isSketchMode && this.app.sketchSolver) {
            if (state.activeGrip.object instanceof PolylineObject && typeof state.activeGrip.metadata?.pointIndex === 'number') {
                const pointToEdit = state.activeGrip.object.points[state.activeGrip.metadata.pointIndex];
                if (pointToEdit) {
                    this.app.sketchSolver.endEdit(pointToEdit);
                }
            }
        } else {
            const snappedPoint = this.getSnappedPoint(point);
            // FIX: Use sceneService to access objects.
            const objectsSource = this.app.isSketchMode ? this.app.sketchContext : this.app.sceneService.objects;
            const selectedObjects = objectsSource.filter(o => this.app.selectionService.selectedIds.includes(o.id));
            
            selectedObjects.forEach(obj => {
                const jsonState = state.initialObjectStates.get(obj.id);
                if (jsonState) {
                    const data = JSON.parse(jsonState);
                    const factory = objectFactory[data.type as keyof typeof objectFactory];
                    if (factory) { Object.assign(obj, factory(data, this.app)); }
                }
            });
            this.applyGripTransform(selectedObjects, snappedPoint, state.currentAction, state.activeGrip);
        }
    
        // FIX: Use projectStateService for history.
        this.app.projectStateService.commit(`Grip edit: ${state.currentAction}`);
        this.reset();
    }    

    /**
     * Обробляє подію руху миші.
     * @param point Координати у світовій системі.
     * @param event Подія MouseEvent.
     */
    onMouseMove(point: Point, event: MouseEvent): void {
        this.activeSnap = null; 
        switch (this.state.name) {
            case 'IDLE':
                this.hoveredGrip = this.findGripAt(point);
                if (this.hoveredGrip) {
                    this.hoveredObject = null;
                } else {
                    const tolerance = SELECTION_TOLERANCE / this.app.canvasController.zoom;
                    const objectsToCheck = this.app.isSketchMode ? this.app.sketchContext : 
                                           this.app.groupEditContext ? this.app.groupEditContext.objects : 
                                           // FIX: Use sceneService to get visible objects.
                                           this.app.sceneService.getVisibleObjectsSortedForRender();
    
                    this.hoveredObject = [...objectsToCheck]
                        .reverse()
                        .find(obj => {
                            // FIX: Use layerService to get the layer for an object.
                            const layer = this.app.layerService.getLayerForObject(obj.id);
                            return (!layer || !layer.isLocked) && obj.contains(point, tolerance, this.app);
                        }) || null;
                }
                
                if (!this.hoveredGrip && !this.hoveredObject) {
                    this.getSnappedPoint(point);
                }
                break;
            case 'MARQUEE_SELECTING':
                this.state.endPoint = point;
                break;
            case 'DRAGGING_OBJECTS':
                const tolerance = 5 / this.app.canvasController.zoom;
                const dx = point.x - this.state.startPoint.x;
                const dy = point.y - this.state.startPoint.y;
                if (!this.state.hasMoved && (dx * dx + dy * dy) > (tolerance * tolerance)) {
                    this.state.hasMoved = true;
                }
                break;
            case 'GRIP_HOT':
                if (this.app.isSketchMode && this.app.sketchSolver) {
                    const { activeGrip } = this.state;
                    if (activeGrip.object instanceof PolylineObject && typeof activeGrip.metadata?.pointIndex === 'number') {
                        const pointToEdit = activeGrip.object.points[activeGrip.metadata.pointIndex];
                        if (pointToEdit) {
                            this.app.sketchSolver.suggestValue(pointToEdit, point); // Raw point, snapping is not needed here
                            this.app.sketchSolver.solve();
                        }
                    }
                }
                break;
        }
    }
    
    /**
     * Застосовує трансформацію до об'єктів на основі дії з "ручкою".
     * @param objects Масив об'єктів для трансформації.
     * @param targetPoint Цільова точка курсору.
     * @param action Дія, яку потрібно виконати.
     * @param grip "Ручка", що ініціювала дію.
     */
    private applyGripTransform(objects: SceneObject[], targetPoint: Point, action: GripAction, grip: Grip) {
        const basePoint = grip.point;
    
        switch (action) {
            case 'MOVE': {
                const dx = targetPoint.x - basePoint.x;
                const dy = targetPoint.y - basePoint.y;
                objects.forEach(obj => obj.move(dx, dy, this.app));
                break;
            }
            case 'STRETCH': {
                const objectToStretch = objects.find(o => o.id === grip.object.id);
                if (objectToStretch) {
                    if (objectToStretch instanceof Wall && grip.metadata?.isCorner) {
                        const dx = targetPoint.x - basePoint.x;
                        const dy = targetPoint.y - basePoint.y;
                        objects.forEach(obj => obj.move(dx, dy, this.app));
                    } else {
                        const gripForStretch: Grip = { ...grip, object: objectToStretch };
                        this.stretchGrip(gripForStretch, targetPoint);
                    }
                }
                break;
            }
            case 'ROTATE': {
                if (this.state.name !== 'GRIP_HOT') break;
                const center = this.state.activeGrip.metadata?.center || this.state.initialSelectionCenter;
                const baseAngle = Math.atan2(basePoint.y - center.y, basePoint.x - center.x);
                const targetAngle = Math.atan2(targetPoint.y - center.y, targetPoint.x - center.x);
                const angle = targetAngle - baseAngle;
                objects.forEach(obj => obj.rotate(angle, center, this.app));
                break;
            }
            case 'SCALE': {
                if (this.state.name !== 'GRIP_HOT') break;
                const center = this.state.activeGrip.metadata?.center || this.state.initialSelectionCenter;
    
                const initialDist = distance(center, basePoint);
                if (initialDist > 1e-6) {
                    const currentDist = distance(center, targetPoint);
                    const scaleFactor = currentDist / initialDist;
                    objects.forEach(obj => obj.scale(scaleFactor, center, this.app));
                }
                break;
            }
        }
    }

    /**
     * Виконує операцію розтягування для конкретної "ручки".
     * @param grip "Ручка", яку потрібно розтягнути.
     * @param targetPoint Цільова точка для розтягування.
     */
    private stretchGrip(grip: Grip, targetPoint: Point) {
        const obj = grip.object;
    
        if (obj instanceof Wall && grip.metadata?.endpoint) {
            if (grip.metadata.endpoint === 'p1') {
                obj.p1 = targetPoint;
            } else if (grip.metadata.endpoint === 'p2') {
                obj.p2 = targetPoint;
            }
            return;
        }
    
        if (typeof grip.metadata?.pointIndex === 'number') {
            const pointIndex = grip.metadata.pointIndex;
    
            if ('points' in obj && Array.isArray((obj as any).points)) {
                (obj as any).points[pointIndex] = targetPoint;
            } else if ('boundary' in obj && Array.isArray((obj as any).boundary)) {
                 (obj as any).boundary[pointIndex] = targetPoint;
            }
        } else {
            const center = grip.metadata?.center ?? obj.getCenter(this.app);
            const initialDist = distance(center, grip.point);
            const currentDist = distance(center, targetPoint);
            if (initialDist > 1e-6) {
                const scaleFactor = currentDist / initialDist;
                obj.scale(scaleFactor, center, this.app);
            }
        }
    }


    /**
     * Обробляє подію відпускання кнопки миші.
     * @param point Координати у світовій системі.
     * @param event Подія MouseEvent.
     */
    onMouseUp(point: Point, event: MouseEvent): void {
        switch (this.state.name) {
            case 'MARQUEE_SELECTING':
                const marqueeRect = {
                    minX: Math.min(this.state.startPoint.x, this.state.endPoint.x),
                    minY: Math.min(this.state.startPoint.y, this.state.endPoint.y),
                    maxX: Math.max(this.state.startPoint.x, this.state.endPoint.x),
                    maxY: Math.max(this.state.startPoint.y, this.state.endPoint.y),
                };
        
                const width = marqueeRect.maxX - marqueeRect.minX;
                const height = marqueeRect.maxY - marqueeRect.minY;
        
                if (width > 5 || height > 5) {
                    const currentIds = new Set(event.shiftKey ? this.app.selectionService.selectedIds : []);
                    const objectsToCheck = this.app.isSketchMode ? this.app.sketchContext :
                                           this.app.groupEditContext ? this.app.groupEditContext.objects : 
                                           // FIX: Use sceneService to get visible objects.
                                           this.app.sceneService.getVisibleObjectsSortedForRender();
                    
                    for (const obj of objectsToCheck) {
                        // FIX: Use layerService to get the layer for an object.
                        const layer = this.app.layerService.getLayerForObject(this.app.groupEditContext?.id ?? obj.id);
                        if (layer?.isLocked) continue;
                        const bbox = obj.getBoundingBox(this.app);
                        if (bbox.maxX >= marqueeRect.minX && bbox.minX <= marqueeRect.maxX &&
                            bbox.maxY >= marqueeRect.minY && bbox.minY <= marqueeRect.maxY) {
                            if (event.shiftKey && currentIds.has(obj.id)) {
                                currentIds.delete(obj.id);
                            } else {
                                currentIds.add(obj.id);
                            }
                        }
                    }
                    this.app.selectionService.set(Array.from(currentIds));
                }
                this.reset();
                break;
            case 'DRAGGING_OBJECTS':
                if (this.state.hasMoved) {
                    // FIX: Use projectStateService for history.
                    this.app.projectStateService.commit(`Move ${this.app.selectionService.selectedIds.length} object(s)`);
                }
                this.reset();
                break;
        }
    }
    
    /**
     * Скидає стан інструменту до початкового (IDLE).
     */
    private reset(): void {
        if(this.state.name === 'GRIP_HOT') {
            this.app.commandLineController.showDefaultPrompt();
        }
        this.state = { name: 'IDLE' };
        this.activeSnap = null;
        this.hoveredGrip = null;
        this.hoveredObject = null;
    }

    /**
     * Деактивує інструмент, скидаючи його стан.
     */
    deactivate(): void {
        this.reset();
        this.app.draw();
    }

    /**
     * Повертає стиль курсору для поточного стану інструменту.
     */
    getCursor(): string {
        if (this.app.inputHandler.isSpacebarPressed) {
            return 'grab';
        }
        switch (this.state.name) {
            case 'DRAGGING_OBJECTS':
                return 'grabbing';
            case 'GRIP_HOT':
                return 'crosshair';
            case 'IDLE':
                if (this.hoveredGrip) {
                    return 'crosshair';
                }
                if (this.hoveredObject) {
                    return 'pointer';
                }
                return 'pickbox';
            case 'MARQUEE_SELECTING':
            default:
                return 'pickbox';
        }
    }
    
    /**
     * Малює тимчасові елементи для інструменту (рамку виділення, "ручки", попередній перегляд).
     * @param ctx Контекст для малювання.
     * @param zoom Поточний рівень масштабування.
     */
    drawOverlay(ctx: CanvasRenderingContext2D, zoom: number): void {
        if (this.state.name === 'MARQUEE_SELECTING') {
            ctx.save();
            const selectionColor = getComputedStyle(document.documentElement).getPropertyValue('--selected-stroke-color');
            ctx.fillStyle = 'rgba(0, 153, 255, 0.1)';
            ctx.strokeStyle = selectionColor;
            ctx.lineWidth = 1 / zoom;
            ctx.setLineDash([4 / zoom, 2 / zoom]);
            const x = this.state.startPoint.x;
            const y = this.state.startPoint.y;
            const w = this.state.endPoint.x - x;
            const h = this.state.endPoint.y - y;
            ctx.fillRect(x, y, w, h);
            ctx.strokeRect(x, y, w, h);
            ctx.restore();
        }
        
        if (this.state.name === 'DRAGGING_OBJECTS' && this.state.hasMoved) {
            const state = this.state;
            const mousePos = this.app.inputHandler.currentWorldPosition;
            const dx = mousePos.x - state.startPoint.x;
            const dy = mousePos.y - state.startPoint.y;
            
            const previewObjects: SceneObject[] = [];
            state.initialObjectStates.forEach((jsonState, id) => {
                const data = JSON.parse(jsonState);
                const factory = objectFactory[data.type as keyof typeof objectFactory];
                if (factory) {
                    const previewObject = factory(data, this.app);
                    previewObject.id = id;
                    previewObjects.push(previewObject);
                }
            });
            
            previewObjects.forEach(obj => obj.move(dx, dy, this.app));
            
            ctx.save();
            ctx.globalAlpha = 0.6;
            // FIX: Use sceneService to access objects.
            const allSceneObjects = this.app.sceneService.objects;
            previewObjects.forEach(obj => obj.draw(ctx, false, zoom, allSceneObjects, this.app));
            ctx.restore();
       }

        const grips = this.getGripsForSelection();
        const activeGripPoint = this.state.name === 'GRIP_HOT' ? this.state.activeGrip.point : null;
        grips.forEach(grip => {
            const isHot = !!(activeGripPoint && grip.point.x === activeGripPoint.x && grip.point.y === activeGripPoint.y);
            const isHovered = this.hoveredGrip === grip;
            drawGrip(ctx, grip, zoom, isHovered, isHot);
        });

        if (this.state.name === 'GRIP_HOT') {
            if (this.app.isSketchMode) {
                // In sketch mode, the model is updated live by the solver,
                // so no separate preview is needed. The main draw call handles it.
            } else {
                const state = this.state;
                const previewObjects: SceneObject[] = [];
                state.initialObjectStates.forEach((jsonState, id) => {
                    const data = JSON.parse(jsonState);
                    const factory = objectFactory[data.type as keyof typeof objectFactory];
                    if (factory) {
                        const previewObject = factory(data, this.app);
                        previewObject.id = id; // Preserve ID for lookups
                        previewObjects.push(previewObject);
                    }
                });
                const mousePos = this.app.inputHandler.currentWorldPosition;
                const snappedMousePos = this.getSnappedPoint(mousePos);
                this.applyGripTransform(previewObjects, snappedMousePos, state.currentAction, state.activeGrip);
                
                ctx.save();
                ctx.globalAlpha = 0.6;
                // FIX: Use sceneService to access objects.
                const allSceneObjects = this.app.sceneService.objects;
                previewObjects.forEach(obj => obj.draw(ctx, false, zoom, allSceneObjects, this.app));
                ctx.restore();
            }
        }
        drawSnapIndicator(ctx, this.activeSnap, zoom);
    }
}
