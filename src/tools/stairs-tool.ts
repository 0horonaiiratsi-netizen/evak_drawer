/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "../app";
import { Point } from "../scene/point";
import { StairsObject, StairsType } from "../scene/stairs-object";
import { Tool, ToolType } from "./tool";
import { snapToGrid } from "../utils/geometry";

export class StairsTool extends Tool {
    private isDrawing = false;
    private startPoint: Point | null = null;
    private currentRect: { x: number, y: number, width: number, height: number } | null = null;
    public selectedStairsType: StairsType = StairsType.STAIRS;

    constructor(app: App) {
        super(app, ToolType.STAIRS);
    }

    onMouseDown(point: Point, event: MouseEvent): void {
        this.isDrawing = true;
        this.startPoint = this.app.isSnappingEnabled ? snapToGrid(point) : point;
    }

    onMouseMove(point: Point, event: MouseEvent): void {
        if (!this.isDrawing || !this.startPoint) return;

        const endPoint = this.app.isSnappingEnabled ? snapToGrid(point) : point;
        const x = Math.min(this.startPoint.x, endPoint.x);
        const y = Math.min(this.startPoint.y, endPoint.y);
        const width = Math.abs(this.startPoint.x - endPoint.x);
        const height = Math.abs(this.startPoint.y - endPoint.y);
        this.currentRect = { x, y, width, height };

        // We use a custom drawOverlay instead of preview line for rectangles
        this.app.draw();
    }

    onMouseUp(point: Point, event: MouseEvent): void {
        if (!this.isDrawing || !this.startPoint || !this.currentRect) return;

        if (this.currentRect.width > 5 && this.currentRect.height > 5) {
            const newStairs = new StairsObject(
                this.app.sceneService.getNextId(),
                this.currentRect.x + this.currentRect.width / 2,
                this.currentRect.y + this.currentRect.height / 2,
                this.currentRect.width,
                this.currentRect.height,
                this.selectedStairsType
            );
            this.app.addSceneObject(newStairs);
            this.app.setSelectedObjectId(newStairs.id);
        }

        this.reset();
        this.app.draw();
    }

    onContextMenu(worldPoint: Point, screenPoint: Point): void {
        this.reset();
        this.app.setActiveTool(ToolType.SELECT);
    }

    private reset(): void {
        this.isDrawing = false;
        this.startPoint = null;
        this.currentRect = null;
    }
    
    deactivate(): void {
        this.reset();
        this.app.draw();
    }

    drawOverlay(ctx: CanvasRenderingContext2D, zoom: number): void {
        if (this.currentRect) {
            ctx.save();
            ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--selected-stroke-color');
            ctx.lineWidth = 1 / zoom;
            ctx.setLineDash([4 / zoom, 2 / zoom]);
            ctx.strokeRect(this.currentRect.x, this.currentRect.y, this.currentRect.width, this.currentRect.height);
            ctx.restore();
        }
    }

    getCursor(): string {
        return 'crosshair';
    }
}