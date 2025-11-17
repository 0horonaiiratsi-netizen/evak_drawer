/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "../app";
import { Command } from "./command";
import { Point } from "../scene/point";
import { SceneObject } from "../scene/scene-object";
import { ToolType } from "../tools/tool";
import { I18nService } from "../i18n";
import { Wall } from "../scene/wall";
import { lineLineIntersection } from "../utils/intersections";
import { distance } from "../utils/geometry";
import { PolylineObject } from "../scene/polyline-object";

type Preview = {
    object: Wall | PolylineObject;
    originalPoints: Point[];
    newPoints: Point[];
} | null;

export class TrimCommand implements Command {
    app: App;
    i18n: I18nService;
    type: ToolType = ToolType.TRIM;
    
    private step: 'selectingBoundaries' | 'selectingToTrim' = 'selectingBoundaries';
    private boundaries: SceneObject[] = [];
    private preview: Preview = null;

    constructor(app: App) {
        this.app = app;
        this.i18n = app.i18n;
    }

    start(preSelectedObjects: SceneObject[] = []): void {
        this.reset();
        if (preSelectedObjects.length > 0) {
            this.boundaries = preSelectedObjects;
            this.step = 'selectingToTrim';
            this.app.commandLineController.setPrompt(this.i18n.t('command.trim.selectObject'));
            this.app.setSelectedObjectIds([]); // Deselect boundaries
        } else {
            this.step = 'selectingBoundaries';
            this.app.commandLineController.setPrompt(this.i18n.t('command.trim.selectBoundaries'));
        }
    }
    
    private getPoints(obj: Wall | PolylineObject): Point[] {
        if (obj instanceof Wall) {
            return [obj.p1, obj.p2];
        }
        return obj.points;
    }
    
    private findObjectAt(point: Point): SceneObject | null {
        const tolerance = 5 / this.app.canvasController.zoom;
        return [...this.app.sceneObjects].reverse().find(obj => 
            (obj instanceof Wall || obj instanceof PolylineObject) &&
            obj.contains(point, tolerance)
        ) || null;
    }
    
    private calculatePreview(point: Point): Preview {
        const objectToTrim = this.findObjectAt(point) as Wall | PolylineObject | null;
        if (!objectToTrim || this.boundaries.some(b => b.id === objectToTrim.id)) {
            return null;
        }

        const objectPoints = this.getPoints(objectToTrim);
        
        let closestDist = Infinity;
        let segmentIndex = -1;
        for (let i = 0; i < objectPoints.length - 1; i++) {
            const p1 = objectPoints[i];
            const p2 = objectPoints[i+1];
            const midPoint = {x: (p1.x+p2.x)/2, y: (p1.y+p2.y)/2};
            const d = distance(point, midPoint);
            if (d < closestDist) {
                closestDist = d;
                segmentIndex = i;
            }
        }
        
        if (segmentIndex === -1) return null;

        const clickedSegmentP1 = objectPoints[segmentIndex];
        const clickedSegmentP2 = objectPoints[segmentIndex + 1];

        const segmentIntersections: Point[] = [];
        for (const boundary of this.boundaries) {
            if (boundary instanceof Wall || boundary instanceof PolylineObject) {
                const boundaryPoints = this.getPoints(boundary);
                for (let j = 0; j < boundaryPoints.length - 1; j++) {
                    const bp1 = boundaryPoints[j];
                    const bp2 = boundaryPoints[j+1];
                    const intersect = lineLineIntersection(clickedSegmentP1, clickedSegmentP2, bp1, bp2);
                    if (intersect) segmentIntersections.push(intersect);
                }
                if (boundary instanceof PolylineObject && boundary.isClosed && boundaryPoints.length > 1) {
                    const intersect = lineLineIntersection(clickedSegmentP1, clickedSegmentP2, boundaryPoints[boundaryPoints.length-1], boundaryPoints[0]);
                    if (intersect) segmentIntersections.push(intersect);
                }
            }
        }
        
        if (segmentIntersections.length === 0) return null;

        let bestIntersection: Point | null = null;
        let bestIntersectionDist = Infinity;
        segmentIntersections.forEach(p => {
            const d = distance(point, p);
            if(d < bestIntersectionDist) {
                bestIntersection = p;
                bestIntersectionDist = d;
            }
        });

        if (!bestIntersection) return null;

        const newPoints = [...objectPoints];
        
        if (distance(point, clickedSegmentP1) < distance(point, clickedSegmentP2)) {
             newPoints[segmentIndex] = bestIntersection;
        } else {
             newPoints[segmentIndex + 1] = bestIntersection;
        }

        return { object: objectToTrim, originalPoints: objectPoints, newPoints };
    }

    finish(): void {
        this.cleanup();
        this.app.commandFinished();
    }
    
    cancel(): void {
        this.cleanup();
        this.app.commandFinished();
    }
    
    private cleanup(): void {
        this.reset();
        this.app.setSelectedObjectIds([]);
        this.app.draw();
    }
    
    private reset(): void {
        this.step = 'selectingBoundaries';
        this.boundaries = [];
        this.preview = null;
    }

    onMouseDown(point: Point, event: MouseEvent): void {
        if (this.step === 'selectingBoundaries') {
            const obj = this.findObjectAt(point);
            if (!obj) return;
            const index = this.boundaries.findIndex(b => b.id === obj.id);
            if (index > -1) {
                this.boundaries.splice(index, 1);
            } else {
                this.boundaries.push(obj);
            }
            this.app.setSelectedObjectIds(this.boundaries.map(b => b.id));
        } else if (this.step === 'selectingToTrim') {
            this.performTrim();
        }
    }

    private performTrim() {
        if (this.preview) {
            const { object, newPoints, originalPoints } = this.preview;
            if (object instanceof Wall) {
                if (originalPoints[0] !== newPoints[0]) object.p1 = newPoints[0];
                if (originalPoints[1] !== newPoints[1]) object.p2 = newPoints[1];
            } else if (object instanceof PolylineObject) {
                object.points = newPoints;
            }
            this.app.commitState("Trim object");
            this.preview = null;
            this.app.draw();
        }
    }
    
    onMouseMove(point: Point, event: MouseEvent): void { 
        if (this.step === 'selectingToTrim') {
            this.preview = this.calculatePreview(point);
            this.app.draw();
        }
    }

    onMouseUp(point: Point, event: MouseEvent): void {}
    
    onKeyDown(event: KeyboardEvent): void { 
        if (event.key === 'Enter') {
            if (this.step === 'selectingBoundaries') {
                if (this.boundaries.length === 0) return;
                this.step = 'selectingToTrim';
                this.app.setSelectedObjectIds([]);
                this.app.commandLineController.setPrompt(this.i18n.t('command.trim.selectObject'));
            } else {
                this.finish();
            }
        }
    }

    onKeyUp(event: KeyboardEvent): void {}
    
    onContextMenu(worldPoint: Point, screenPoint: Point): void {
        if (this.step === 'selectingBoundaries' && this.boundaries.length > 0) {
            this.step = 'selectingToTrim';
            this.app.setSelectedObjectIds([]);
            this.app.commandLineController.setPrompt(this.i18n.t('command.trim.selectObject'));
        } else {
            this.finish();
        }
    }
    
    drawOverlay(ctx: CanvasRenderingContext2D, zoom: number): void {
        if (this.preview) {
            const { originalPoints, newPoints } = this.preview;
            ctx.save();
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 3 / zoom;
            ctx.globalAlpha = 0.7;
            ctx.setLineDash([4 / zoom, 4 / zoom]);

            ctx.beginPath();
            for(let i=0; i < originalPoints.length; i++) {
                if (originalPoints[i] !== newPoints[i]) {
                     ctx.moveTo(originalPoints[i].x, originalPoints[i].y);
                     ctx.lineTo(newPoints[i].x, newPoints[i].y);
                }
            }
            ctx.stroke();
            ctx.restore();
        }
    }

    activate(): void {}
    deactivate(): void { this.cancel(); }
    getCursor(): string { return 'crosshair'; }
}