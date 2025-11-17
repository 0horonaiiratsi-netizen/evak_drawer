/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "../app";
import { Point } from "../scene/point";
import { Tool, ToolType } from "./tool";
import { distance, findClosestSnapPoint } from "../utils/geometry";
import { OBJECT_SNAP_DISTANCE } from "../constants";
import { SnapResult } from "../snapping";
import { drawSnapIndicator } from "../utils/snap-indicator-drawer";

export class ScaleByReferenceTool extends Tool {
    private step = 0;
    private basePoint: Point | null = null;
    private referencePoint: Point | null = null;
    private activeSnap: SnapResult | null = null;
    
    constructor(app: App) {
        super(app, ToolType.SCALE_BY_REFERENCE);
    }
    
    async activate(): Promise<void> {
        super.activate();
        this.reset();
        if (this.app.selectionService.selectedIds.length !== 1) {
            this.resetAndSwitchToSelect();
            return;
        }
        await this.app.dialogController.alert(
            "Масштабування за опорним відрізком",
            "1. Клацніть, щоб задати базову точку масштабування.\n2. Клацніть, щоб задати опорну точку (поточна довжина).\n3. Клацніть, щоб задати цільову точку (нова довжина)."
        );
    }

    private getSnappedPoint(point: Point): Point {
        this.activeSnap = null;
        if (this.app.snapModes.size > 0) {
            const tolerance = OBJECT_SNAP_DISTANCE / this.app.canvasController.zoom;
            const objectId = this.app.selectionService.selectedIds[0];
            const selectedObject = objectId !== undefined ? this.app.sceneService.objects.find(obj => obj.id === objectId) : undefined;
            const snapResult = findClosestSnapPoint(point, this.app.sceneService.objects, tolerance, this.app.snapModes, selectedObject);
            if (snapResult) {
                this.activeSnap = snapResult;
                return snapResult.point;
            }
        }
        return point;
    }


    async onMouseDown(point: Point, _event: MouseEvent): Promise<void> {
        const snappedPoint = this.getSnappedPoint(point);
        const objectId = this.app.selectionService.selectedIds[0];
        const selectedObject = objectId !== undefined ? this.app.sceneService.objects.find(obj => obj.id === objectId) : undefined;
        
        if (!selectedObject) {
            this.resetAndSwitchToSelect();
            return;
        }

        const layer = this.app.layerService.getLayerForObject(selectedObject.id);
        if (layer?.isLocked) {
            await this.app.dialogController.alert("Помилка", "Неможливо змінити об'єкт на заблокованому шарі.");
            this.resetAndSwitchToSelect();
            return;
        }

        switch (this.step) {
            case 0:
                this.basePoint = snappedPoint;
                this.step = 1;
                break;
            case 1:
                this.referencePoint = snappedPoint;
                this.step = 2;
                break;
            case 2:
                if (!this.basePoint || !this.referencePoint) {
                    this.resetAndSwitchToSelect();
                    return;
                }
                
                const targetPoint = snappedPoint;
                const currentLength = distance(this.basePoint, this.referencePoint);
                const targetLength = distance(this.basePoint, targetPoint);

                if (currentLength < 1e-6) {
                    this.resetAndSwitchToSelect();
                    return; // Avoid division by zero
                }
                
                const scaleFactor = targetLength / currentLength;

                selectedObject.scale(scaleFactor, this.basePoint);
                this.app.projectStateService.commit("Scale object by visual reference");
                this.app.propertiesController.show([selectedObject]);
                this.app.draw();
                this.resetAndSwitchToSelect();
                break;
        }
    }
    
    onMouseMove(point: Point): void {
        const snappedPoint = this.getSnappedPoint(point);
        if ((this.step === 1 || this.step === 2) && this.basePoint) {
            this.app.canvasController.setPreviewLine(this.basePoint, snappedPoint);
        } else {
            this.app.canvasController.setPreviewLine(null);
        }
    }
    
    private reset(): void {
        this.step = 0;
        this.basePoint = null;
        this.referencePoint = null;
        this.activeSnap = null;
        this.app.canvasController.setPreviewLine(null);
        this.app.draw();
    }

    private resetAndSwitchToSelect(): void {
        this.reset();
        this.app.setActiveTool(ToolType.SELECT);
    }

    deactivate(): void {
        this.reset();
    }

    drawOverlay(ctx: CanvasRenderingContext2D, zoom: number): void {
        ctx.save();
        const selectionColor = getComputedStyle(document.documentElement).getPropertyValue('--selected-stroke-color');
        
        if (this.basePoint) {
            ctx.fillStyle = selectionColor;
            const size = 10 / zoom;
            ctx.fillRect(this.basePoint.x - size/2, this.basePoint.y - size/2, size, size);
        }
        
        if (this.referencePoint) {
            ctx.strokeStyle = 'rgba(204, 204, 204, 0.7)';
            ctx.lineWidth = 2 / zoom;
            ctx.setLineDash([6 / zoom, 4 / zoom]);
            ctx.beginPath();
            ctx.moveTo(this.basePoint!.x, this.basePoint!.y);
            ctx.lineTo(this.referencePoint.x, this.referencePoint.y);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        drawSnapIndicator(ctx, this.activeSnap, zoom);
        ctx.restore();
    }

    getCursor(): string {
        return 'crosshair';
    }
}