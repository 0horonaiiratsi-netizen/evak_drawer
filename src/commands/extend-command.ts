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
import { infiniteLineLineIntersection } from "../utils/intersections";
import { distance } from "../utils/geometry";
import { PolylineObject } from "../scene/polyline-object";

type Preview = {
    object: Wall | PolylineObject;
    originalPoint: Point;
    newPoint: Point;
} | null;

function getPoints(obj: Wall | PolylineObject): Point[] {
    if (obj instanceof Wall) {
        return [obj.p1, obj.p2];
    }
    return obj.points;
}

export class ExtendCommand implements Command {
    app: App;
    i18n: I18nService;
    type: ToolType = ToolType.EXTEND;
    
    private step: 'selectingBoundaries' | 'selectingToExtend' = 'selectingBoundaries';
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
            this.step = 'selectingToExtend';
            this.app.commandLineController.setPrompt(this.i18n.t('command.extend.selectObject'));
            this.app.setSelectedObjectIds([]);
        } else {
            this.step = 'selectingBoundaries';
            this.app.commandLineController.setPrompt(this.i18n.t('command.extend.selectBoundaries'));
        }
    }
    
    private findObjectAt(point: Point): SceneObject | null {
        const tolerance = 5 / this.app.canvasController.zoom;
        return [...this.app.sceneObjects].reverse().find(obj => 
            (obj instanceof Wall || obj instanceof PolylineObject) &&
            obj.contains(point, tolerance)
        ) || null;
    }
    
    private calculatePreview(point: Point): Preview {
        const objectToExtend = this.findObjectAt(point) as Wall | PolylineObject | null;
        if (!objectToExtend || (objectToExtend instanceof PolylineObject && objectToExtend.isClosed)) {
            return null;
        }

        const objPoints = getPoints(objectToExtend);
        if (objPoints.length < 2) return null;

        const distToStart = distance(point, objPoints[0]);
        const distToEnd = distance(point, objPoints[objPoints.length - 1]);
        
        const tolerance = 15 / this.app.canvasController.zoom;
        if (Math.min(distToStart, distToEnd) > tolerance) return null;

        const pointToExtend = distToStart < distToEnd ? objPoints[0] : objPoints[objPoints.length - 1];
        const otherPoint = pointToExtend === objPoints[0] ? objPoints[1] : objPoints[objPoints.length - 2];
        
        const candidateIntersections: Point[] = [];

        for (const boundary of this.boundaries) {
            let boundarySegments: [Point, Point][] = [];
            if (boundary instanceof Wall || (boundary instanceof PolylineObject)) {
                const boundaryPoints = getPoints(boundary as Wall | PolylineObject);
                for (let j = 0; j < boundaryPoints.length - 1; j++) {
                    boundarySegments.push([boundaryPoints[j], boundaryPoints[j+1]]);
                }
                if (boundary instanceof PolylineObject && boundary.isClosed && boundaryPoints.length > 1) {
                    boundarySegments.push([boundaryPoints[boundaryPoints.length-1], boundaryPoints[0]]);
                }
            }
            
            for (const seg of boundarySegments) {
                const intersection = infiniteLineLineIntersection(otherPoint, pointToExtend, seg[0], seg[1]);
                if (intersection) {
                     const dx = seg[1].x - seg[0].x;
                     const dy = seg[1].y - seg[0].y;
                     const lenSq = dx*dx + dy*dy;
                     if (lenSq === 0) continue;
                     const t = ((intersection.x - seg[0].x) * dx + (intersection.y - seg[0].y) * dy) / lenSq;
                     if (t >= -1e-9 && t <= 1 + 1e-9) {
                        if (distance(otherPoint, intersection) > distance(otherPoint, pointToExtend)) {
                            candidateIntersections.push(intersection);
                        }
                     }
                }
            }
        }
        
        if (candidateIntersections.length === 0) return null;

        const closestIntersection = candidateIntersections.sort((a, b) => distance(pointToExtend, a) - distance(pointToExtend, b))[0];

        return {
            object: objectToExtend,
            originalPoint: pointToExtend,
            newPoint: closestIntersection
        };
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
        } else if (this.step === 'selectingToExtend') {
            this.performExtend();
        }
    }
    
    private performExtend() {
        if (this.preview) {
            const { object, newPoint, originalPoint } = this.preview;
            if (object instanceof Wall) {
                if (object.p1 === originalPoint) object.p1 = newPoint;
                else object.p2 = newPoint;
            } else if (object instanceof PolylineObject) {
                 if (object.points[0] === originalPoint) {
                    object.points[0] = newPoint;
                } else if (object.points[object.points.length - 1] === originalPoint) {
                    object.points[object.points.length - 1] = newPoint;
                }
            }
            this.app.commitState("Extend object");
            this.preview = null;
            this.app.draw();
        }
    }

    onMouseMove(point: Point, event: MouseEvent): void { 
        if (this.step === 'selectingToExtend') {
            this.preview = this.calculatePreview(point);
            this.app.draw();
        }
    }
    onMouseUp(point: Point, event: MouseEvent): void {}
    onKeyDown(event: KeyboardEvent): void { 
        if (event.key === 'Enter') {
            if (this.step === 'selectingBoundaries') {
                 if (this.boundaries.length === 0) return;
                this.step = 'selectingToExtend';
                this.app.setSelectedObjectIds([]);
                this.app.commandLineController.setPrompt(this.i18n.t('command.extend.selectObject'));
            } else {
                this.finish();
            }
        }
    }
    onKeyUp(event: KeyboardEvent): void {}
    
    onContextMenu(worldPoint: Point, screenPoint: Point): void {
        if (this.step === 'selectingBoundaries' && this.boundaries.length > 0) {
            this.step = 'selectingToExtend';
            this.app.setSelectedObjectIds([]);
            this.app.commandLineController.setPrompt(this.i18n.t('command.extend.selectObject'));
        } else {
            this.finish();
        }
    }
    
    drawOverlay(ctx: CanvasRenderingContext2D, zoom: number): void {
        if (this.preview) {
            const { object, newPoint, originalPoint } = this.preview;
            ctx.save();
            ctx.strokeStyle = '#90EE90';
            ctx.lineWidth = 3 / zoom;
            ctx.globalAlpha = 0.7;
            ctx.setLineDash([4 / zoom, 4 / zoom]);
            
            ctx.beginPath();
            ctx.moveTo(originalPoint.x, originalPoint.y);
            ctx.lineTo(newPoint.x, newPoint.y);
            ctx.stroke();
            ctx.restore();
        }
    }

    activate(): void {}
    deactivate(): void { this.cancel(); }
    getCursor(): string { return 'crosshair'; }
}