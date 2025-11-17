/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
// FIX: Corrected import paths for a file located in src/
import { App } from "./app";
import { Point } from "./scene/point";
import { Tool, ToolType } from "./tools/tool";
import { SELECTION_TOLERANCE, OBJECT_SNAP_DISTANCE } from "./constants";
import { SceneObject } from "./scene/scene-object";
import { distance, findClosestSnapPoint, snapToOrtho } from "./utils/geometry";
import { Grip, GripAction, GripType } from "./grips";
import { drawGrip } from "./utils/grip-drawer";
import { objectFactory } from "./scene/factory";
import { GroupObject } from "./scene/group-object";
import { SnapResult } from "./snapping";
import { drawSnapIndicator } from "./utils/snap-indicator-drawer";
import { Wall } from "./scene/wall";

type SelectToolState =
    | { name: 'IDLE' }
    | { name: 'MARQUEE_SELECTING', startPoint: Point, endPoint: Point }
    | { name: 'DRAGGING_OBJECTS', lastPoint: Point, hasMoved: boolean }
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
    private activeSnap: SnapResult | null = null;
    
    constructor(app: App) {
        super(app, ToolType.SELECT);
    }
    
    private getGripsForSelection(): Grip[] {
        const objects = this.app.groupEditContext ? this.app.groupEditContext.objects : this.app.sceneObjects;
        const selectedObjects = objects.filter(obj => this.app.selectedObjectIds.includes(obj.id));
        
        let allGrips: Grip[] = [];
        for (const obj of selectedObjects) {
            const layer = this.app.getLayerForObject(obj.id);
            if (!layer?.isLocked) {
                allGrips.push(...obj.getGrips());
            }
        }
        return allGrips;
    }
    
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

    private getSnappedPoint(point: Point): Point {
        this.activeSnap = null;
        let snappedPoint = point; // Start with the raw mouse position.
    
        // 1. Apply Ortho snapping if conditions are met.
        // This provides the primary constraint.
        if (this.app.isOrthoEnabled && this.state.name === 'GRIP_HOT') {
            const { activeGrip, currentAction } = this.state;
    
            // Ortho should only apply during a STRETCH action on a wall's endpoint.
            // It doesn't make sense for MOVE, ROTATE, or SCALE.
            if (currentAction === 'STRETCH' && activeGrip.object instanceof Wall && activeGrip.metadata?.endpoint) {
                const wall = activeGrip.object;
                const contextPoint = activeGrip.metadata.endpoint === 'p1' ? wall.p2 : wall.p1;
                snappedPoint = snapToOrtho(contextPoint, snappedPoint);
            }
        }
    
        // 2. Apply Object snapping to the (potentially) ortho-snapped point.
        // This allows snapping to objects that lie on the ortho axis.
        const objectToExclude = this.state.name === 'GRIP_HOT' ? this.state.activeGrip.object : undefined;
        if (this.app.snapModes.size > 0) {
            const tolerance = OBJECT_SNAP_DISTANCE / this.app.canvasController.zoom;
            const snapResult = findClosestSnapPoint(
                snappedPoint, // Use the modified point
                this.app.sceneObjects,
                tolerance,
                this.app.snapModes,
                objectToExclude
            );
    
            if (snapResult) {
                this.activeSnap = snapResult;
                return snapResult.point; // Object snap has the highest priority.
            }
        }
        
        // 3. If no object snap occurred, return the result of the ortho snap.
        return snappedPoint;
    }

    onMouseDown(point: Point, event: MouseEvent): void {
        // If a grip action is active, this click is the second click to finalize the action.
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
        const objectsToCheck = this.app.groupEditContext 
            ? this.app.groupEditContext.objects 
            : this.app.getVisibleObjectsSortedForRender();

        const clickedObject = [...objectsToCheck]
            .reverse()
            .find(obj => {
                const layer = this.app.getLayerForObject(this.app.groupEditContext?.id ?? obj.id);
                return (!layer || !layer.isLocked) && obj.contains(point, tolerance);
            });
            
        if (clickedObject) {
            if (!event.shiftKey && !this.app.selectedObjectIds.includes(clickedObject.id)) {
                 this.app.setSelectedObjectIds([clickedObject.id]);
            } else if (event.shiftKey) {
                const currentIds = new Set(this.app.selectedObjectIds);
                if (currentIds.has(clickedObject.id)) {
                    currentIds.delete(clickedObject.id);
                } else {
                    currentIds.add(clickedObject.id);
                }
                this.app.setSelectedObjectIds(Array.from(currentIds));
            }
            this.state = { name: 'DRAGGING_OBJECTS', lastPoint: point, hasMoved: false };
        } else {
            if (!event.shiftKey) {
                this.app.setSelectedObjectIds([]);
            }
            this.state = { name: 'MARQUEE_SELECTING', startPoint: point, endPoint: point };
        }
    }

    public startGripAction(grip: Grip, action: GripAction) {
        const availableActions = this.getAvailableActionsForGrip(grip);
        if (!availableActions.includes(action)) {
            console.warn(`Action ${action} is not available for this grip.`);
            return;
        }

        const initialStates = new Map<number, string>();
        const selectedObjects = this.app.sceneObjects.filter(o => this.app.selectedObjectIds.includes(o.id));
        selectedObjects.forEach(obj => {
            initialStates.set(obj.id, JSON.stringify(obj.toJSON()));
        });
        const initialSelectionCenter = new GroupObject(0, selectedObjects).getCenter();

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

    private activateGrip(grip: Grip) {
        const availableActions = this.getAvailableActionsForGrip(grip);
        
        const initialStates = new Map<number, string>();
        const selectedObjects = this.app.sceneObjects.filter(o => this.app.selectedObjectIds.includes(o.id));
        selectedObjects.forEach(obj => {
            initialStates.set(obj.id, JSON.stringify(obj.toJSON()));
        });
        const initialSelectionCenter = new GroupObject(0, selectedObjects).getCenter();

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

    private getAvailableActionsForGrip(grip: Grip): GripAction[] {
        // If it's a wall's corner grip, it can only be used to move.
        if (grip.object instanceof Wall && grip.metadata?.isCorner) {
            return ['MOVE'];
        }
        
        switch (grip.type) {
            case GripType.STRETCH:
                return ['STRETCH', 'MOVE', 'ROTATE', 'SCALE'];
            case GripType.MOVE:
                return ['MOVE'];
            case GripType.ROTATE:
                return ['ROTATE'];
            default:
                return [];
        }
    }

    private updateCommandStatus() {
        if (this.state.name === 'GRIP_HOT') {
            let statusMessage: string;
            switch(this.state.currentAction) {
                case 'STRETCH': statusMessage = 'РОЗТЯГНУТИ'; break;
                case 'MOVE': statusMessage = 'ПЕРЕМІСТИТИ'; break;
                case 'ROTATE': statusMessage = 'ОБЕРТАТИ'; break;
                case 'SCALE': statusMessage = 'МАСШТАБУВАТИ'; break;
                default: statusMessage = this.state.currentAction;
            }
            this.app.commandLineController.setPrompt(`** ${statusMessage} **`);
        } else {
            this.app.commandLineController.showDefaultPrompt();
        }
    }
    
    onKeyDown(event: KeyboardEvent): void {
        if (this.state.name !== 'GRIP_HOT') return;

        if (event.key === 'Escape') {
            this.cancelGripAction();
            event.preventDefault();
        }

        if (event.key === ' ' || event.key === 'Enter') {
            this.cycleGripAction();
            event.preventDefault();
        }
    }

    private cycleGripAction() {
        if (this.state.name !== 'GRIP_HOT') return;
        
        const newIndex = (this.state.actionIndex + 1) % this.state.availableActions.length;
        this.state.actionIndex = newIndex;
        this.state.currentAction = this.state.availableActions[newIndex];
        
        this.updateCommandStatus();
        this.app.draw(); // Redraw to update preview for new action
    }

    private cancelGripAction() {
        if (this.state.name !== 'GRIP_HOT') return;
        const state = this.state;

        // Restore objects from their initial state
        state.initialObjectStates.forEach((jsonState, id) => {
            const obj = this.app.sceneObjects.find(o => o.id === id);
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

    private finalizeGripAction(point: Point) {
        if (this.state.name !== 'GRIP_HOT') return;
        const state = this.state;
    
        const snappedPoint = this.getSnappedPoint(point);
        const selectedObjects = this.app.sceneObjects.filter(o => this.app.selectedObjectIds.includes(o.id));
        
        // Restore from initial state FIRST
        selectedObjects.forEach(obj => {
            const jsonState = state.initialObjectStates.get(obj.id);
            if (jsonState) {
                const data = JSON.parse(jsonState);
                const factory = objectFactory[data.type as keyof typeof objectFactory];
                if (factory) {
                    Object.assign(obj, factory(data, this.app));
                }
            }
        });
    
        // THEN apply the final transform
        this.applyGripTransform(selectedObjects, snappedPoint, state.currentAction, state.activeGrip);
    
        this.app.commitState(`Grip edit: ${state.currentAction}`);
        this.reset();
    }    

    onMouseMove(point: Point, event: MouseEvent): void {
        this.activeSnap = null; // Clear snap on every move, will be re-calculated if needed
        switch (this.state.name) {
            case 'IDLE':
                this.hoveredGrip = this.findGripAt(point);
                if (!this.hoveredGrip) {
                    this.getSnappedPoint(point); // Check for object snaps when not hovering a grip
                }
                break;
            case 'MARQUEE_SELECTING':
                this.state.endPoint = point;
                break;
            case 'DRAGGING_OBJECTS':
                const dx = point.x - this.state.lastPoint.x;
                const dy = point.y - this.state.lastPoint.y;
                if (dx !== 0 || dy !== 0) {
                    this.state.hasMoved = true;
                    const objects = this.app.groupEditContext ? this.app.groupEditContext.objects : this.app.sceneObjects;
                    const selectedObjects = objects.filter(obj => this.app.selectedObjectIds.includes(obj.id));
                    selectedObjects.forEach(obj => obj.move(dx, dy));
                    this.state.lastPoint = point;
                }
                break;
            case 'GRIP_HOT':
                // The preview is handled in drawOverlay, which is triggered by the main draw call in InputHandler
                break;
        }
    }
    
    private applyGripTransform(objects: SceneObject[], targetPoint: Point, action: GripAction, grip: Grip) {
        const basePoint = grip.point; // The grip's position when it was activated.
    
        switch (action) {
            case 'MOVE': {
                const dx = targetPoint.x - basePoint.x;
                const dy = targetPoint.y - basePoint.y;
                objects.forEach(obj => obj.move(dx, dy));
                break;
            }
            case 'STRETCH': {
                const objectToStretch = objects.find(o => o.id === grip.object.id);
                if (objectToStretch) {
                    // If it's a wall's corner grip, it acts as a MOVE grip for the entire selection.
                    if (objectToStretch instanceof Wall && grip.metadata?.isCorner) {
                        const dx = targetPoint.x - basePoint.x;
                        const dy = targetPoint.y - basePoint.y;
                        objects.forEach(obj => obj.move(dx, dy));
                    } else {
                        // For all other cases (including wall endpoints), perform a normal stretch on the single object.
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
                objects.forEach(obj => obj.rotate(angle, center));
                break;
            }
            case 'SCALE': {
                if (this.state.name !== 'GRIP_HOT') break;
                const center = this.state.activeGrip.metadata?.center || this.state.initialSelectionCenter;
    
                const initialDist = distance(center, basePoint);
                if (initialDist > 1e-6) {
                    const currentDist = distance(center, targetPoint);
                    const scaleFactor = currentDist / initialDist;
                    objects.forEach(obj => obj.scale(scaleFactor, center));
                }
                break;
            }
        }
    }

    private stretchGrip(grip: Grip, targetPoint: Point) {
        const obj = grip.object;
    
        // Handle Wall endpoint stretching
        if (obj instanceof Wall && grip.metadata?.endpoint) {
            if (grip.metadata.endpoint === 'p1') {
                obj.p1 = targetPoint;
            } else if (grip.metadata.endpoint === 'p2') {
                obj.p2 = targetPoint;
            }
            return; // Early exit after handling wall stretch
        }
    
        // Handle generic indexed points (Polylines, Arcs, etc.)
        if (typeof grip.metadata?.pointIndex === 'number') {
            const pointIndex = grip.metadata.pointIndex;
    
            if ('points' in obj && Array.isArray((obj as any).points)) { // Polyline-like
                (obj as any).points[pointIndex] = targetPoint;
            } else if ('boundary' in obj && Array.isArray((obj as any).boundary)) { // Hatch-like
                 (obj as any).boundary[pointIndex] = targetPoint;
            }
        } else {
            // Default stretch for objects without indexed points is a scale from their center
            const center = grip.metadata?.center ?? obj.getCenter();
            const initialDist = distance(center, grip.point);
            const currentDist = distance(center, targetPoint);
            if (initialDist > 1e-6) {
                const scaleFactor = currentDist / initialDist;
                obj.scale(scaleFactor, center);
            }
        }
    }


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
        
                if (width > 5 || height > 5) { // Avoid tiny marquees
                    const currentIds = new Set(event.shiftKey ? this.app.selectedObjectIds : []);
                    const objectsToCheck = this.app.groupEditContext ? this.app.groupEditContext.objects : this.app.getVisibleObjectsSortedForRender();
                    
                    for (const obj of objectsToCheck) {
                        const layer = this.app.getLayerForObject(this.app.groupEditContext?.id ?? obj.id);
                        if (layer?.isLocked) continue;
                        const bbox = obj.getBoundingBox();
                        if (bbox.maxX >= marqueeRect.minX && bbox.minX <= marqueeRect.maxX &&
                            bbox.maxY >= marqueeRect.minY && bbox.minY <= marqueeRect.maxY) {
                            if (event.shiftKey && currentIds.has(obj.id)) {
                                currentIds.delete(obj.id);
                            } else {
                                currentIds.add(obj.id);
                            }
                        }
                    }
                    this.app.setSelectedObjectIds(Array.from(currentIds));
                }
                this.reset();
                break;
            case 'DRAGGING_OBJECTS':
                if (this.state.hasMoved) {
                    this.app.commitState(`Move ${this.app.selectedObjectIds.length} object(s)`);
                }
                this.reset();
                break;
        }
    }
    
    private reset(): void {
        if(this.state.name === 'GRIP_HOT') {
            this.app.commandLineController.showDefaultPrompt();
        }
        this.state = { name: 'IDLE' };
        this.activeSnap = null;
    }

    deactivate(): void {
        this.reset();
        this.app.draw();
    }

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
            case 'MARQUEE_SELECTING':
            default:
                return 'default';
        }
    }
    
    drawOverlay(ctx: CanvasRenderingContext2D, zoom: number): void {
        // Draw marquee selection box
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
        
        // Draw grips for selected objects
        const grips = this.getGripsForSelection();
        const activeGripPoint = this.state.name === 'GRIP_HOT' ? this.state.activeGrip.point : null;
        grips.forEach(grip => {
            const isHot = !!(activeGripPoint && grip.point.x === activeGripPoint.x && grip.point.y === activeGripPoint.y);
            const isHovered = this.hoveredGrip === grip;
            drawGrip(ctx, grip, zoom, isHovered, isHot);
        });

        // Draw preview of grip action
        if (this.state.name === 'GRIP_HOT') {
            const state = this.state;
            // 1. Create temporary preview objects from initial state
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
    
            // 2. Get current mouse position and snap it
            const mousePos = this.app.inputHandler.currentWorldPosition;
            const snappedMousePos = this.getSnappedPoint(mousePos);
    
            // 3. Apply the current transformation to the preview objects
            this.applyGripTransform(previewObjects, snappedMousePos, state.currentAction, state.activeGrip);
    
            // 4. Draw the transformed preview objects
            ctx.save();
            ctx.globalAlpha = 0.6;
            const allSceneObjects = this.app.sceneObjects;
            // FIX: Expected 5 arguments, but got 4.
            previewObjects.forEach(obj => obj.draw(ctx, false, zoom, allSceneObjects, this.app));
            ctx.restore();
        }
        drawSnapIndicator(ctx, this.activeSnap, zoom);
    }
}