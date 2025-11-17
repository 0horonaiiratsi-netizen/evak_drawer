/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "../app";
import { StyleManager } from "../style-manager";
import { DimensionStyle } from "../styles/dimension-style";
import { distance } from "../utils/geometry";
import { DimensionObject } from "./dimension-object";
import { Point } from "./point";
import { SceneObject } from "./scene-object";

export class LinearDimensionObject extends DimensionObject {
    isVertical: boolean; // true for vertical, false for horizontal

    constructor(id: number, defPoint1: Point, defPoint2: Point, dimLinePoint: Point, isVertical: boolean, styleName: string = 'Standard') {
        super(id, defPoint1, defPoint2, dimLinePoint, styleName);
        this.isVertical = isVertical;
    }

    draw(ctx: CanvasRenderingContext2D, isSelected: boolean, zoom: number, allVisibleObjects: readonly SceneObject[], app: App): void {
        const style = app.styleManager.getDimensionStyle(this.styleName) || new DimensionStyle('temp');
        const textStyle = app.styleManager.getTextStyle(style.textStyleName);

        const p1 = this.defPoint1;
        const p2 = this.defPoint2;

        let measuredDist: number;
        let dimLineStart: Point, dimLineEnd: Point;
        let extLine1Start: Point, extLine1End: Point;
        let extLine2Start: Point, extLine2End: Point;

        if (this.isVertical) {
            const dimLineX = this.dimLinePoint.x;
            measuredDist = Math.abs(p1.y - p2.y);

            dimLineStart = { x: dimLineX, y: p1.y };
            dimLineEnd = { x: dimLineX, y: p2.y };
            
            const dir1 = Math.sign(p1.x - dimLineX);
            extLine1Start = { x: p1.x - style.extLineOffset * dir1, y: p1.y };
            extLine1End = { x: dimLineX - style.extLineExtend * dir1, y: p1.y };
            
            const dir2 = Math.sign(p2.x - dimLineX);
            extLine2Start = { x: p2.x - style.extLineOffset * dir2, y: p2.y };
            extLine2End = { x: dimLineX - style.extLineExtend * dir2, y: p2.y };
            
        } else { // Horizontal
            const dimLineY = this.dimLinePoint.y;
            measuredDist = Math.abs(p1.x - p2.x);
            
            dimLineStart = { x: p1.x, y: dimLineY };
            dimLineEnd = { x: p2.x, y: dimLineY };

            const dir1 = Math.sign(p1.y - dimLineY);
            extLine1Start = { x: p1.x, y: p1.y - style.extLineOffset * dir1 };
            extLine1End = { x: p1.x, y: dimLineY - style.extLineExtend * dir1 };

            const dir2 = Math.sign(p2.y - dimLineY);
            extLine2Start = { x: p2.x, y: p2.y - style.extLineOffset * dir2 };
            extLine2End = { x: p2.x, y: dimLineY - style.extLineExtend * dir2 };
        }

        const dimText = this.textOverride ?? measuredDist.toFixed(style.unitPrecision);

        ctx.save();
        const selectedColor = getComputedStyle(document.documentElement).getPropertyValue('--selected-stroke-color');
        
        // Draw extension lines
        ctx.strokeStyle = isSelected ? selectedColor : style.extLineColor;
        ctx.lineWidth = style.extLineWidth / zoom;
        ctx.beginPath();
        ctx.moveTo(extLine1Start.x, extLine1Start.y);
        ctx.lineTo(extLine1End.x, extLine1End.y);
        ctx.moveTo(extLine2Start.x, extLine2Start.y);
        ctx.lineTo(extLine2End.x, extLine2End.y);
        ctx.stroke();

        // Prepare for dim line and text
        ctx.strokeStyle = isSelected ? selectedColor : style.lineColor;
        ctx.fillStyle = isSelected ? selectedColor : style.textColor;
        ctx.lineWidth = style.lineWidth / zoom;

        // Text measurement
        ctx.font = `${style.textHeight}px ${textStyle?.fontFamily || 'Arial'}`;
        const textMetrics = ctx.measureText(dimText);
        const textWidth = textMetrics.width;

        // Calculate text position and line break
        const textPadding = 4;
        const textGap = textWidth + textPadding * 2;
        const dimLineLength = distance(dimLineStart, dimLineEnd);
        const textCenter = { x: (dimLineStart.x + dimLineEnd.x) / 2, y: (dimLineStart.y + dimLineEnd.y) / 2 };

        let textPos: Point;
        if (this.isVertical) {
            textPos = { x: textCenter.x + style.textOffset, y: textCenter.y };
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
        } else {
            textPos = { x: textCenter.x, y: textCenter.y - style.textOffset };
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
        }

        // Draw dimension line (with gap for text)
        if (dimLineLength > textGap) {
            const ratio = (dimLineLength - textGap) / 2 / dimLineLength;
            const line1End = { x: dimLineStart.x + (dimLineEnd.x - dimLineStart.x) * ratio, y: dimLineStart.y + (dimLineEnd.y - dimLineStart.y) * ratio };
            const line2Start = { x: dimLineEnd.x - (dimLineEnd.x - dimLineStart.x) * ratio, y: dimLineEnd.y - (dimLineEnd.y - dimLineStart.y) * ratio };

            ctx.beginPath();
            ctx.moveTo(dimLineStart.x, dimLineStart.y);
            ctx.lineTo(line1End.x, line1End.y);
            ctx.moveTo(line2Start.x, line2Start.y);
            ctx.lineTo(dimLineEnd.x, dimLineEnd.y);
            ctx.stroke();

        } else { // Text doesn't fit, draw full line and text outside
            ctx.beginPath();
            ctx.moveTo(dimLineStart.x, dimLineStart.y);
            ctx.lineTo(dimLineEnd.x, dimLineEnd.y);
            ctx.stroke();
            if (this.isVertical) textPos.x += textWidth / 2;
            else textPos.y -= style.textHeight;
        }

        // Draw text
        ctx.fillText(dimText, textPos.x, textPos.y);

        // Draw arrows
        if (this.isVertical) {
            this.drawArrow(ctx, dimLineStart, Math.PI / 2, style);
            this.drawArrow(ctx, dimLineEnd, -Math.PI / 2, style);
        } else {
            this.drawArrow(ctx, dimLineStart, Math.PI, style);
            this.drawArrow(ctx, dimLineEnd, 0, style);
        }
        ctx.restore();
    }

    clone(newId: number, app?: App): LinearDimensionObject {
        const newDim = new LinearDimensionObject(newId, {...this.defPoint1}, {...this.defPoint2}, {...this.dimLinePoint}, this.isVertical, this.styleName);
        newDim.textOverride = this.textOverride;
        return newDim;
    }
    
    toJSON(): any {
        return {
            type: 'linearDimension',
            id: this.id,
            styleName: this.styleName,
            defPoint1: this.defPoint1,
            defPoint2: this.defPoint2,
            dimLinePoint: this.dimLinePoint,
            isVertical: this.isVertical,
            textOverride: this.textOverride,
        };
    }
    
    static fromJSON(data: any, app: App): LinearDimensionObject {
        const dim = new LinearDimensionObject(data.id, data.defPoint1, data.defPoint2, data.dimLinePoint, data.isVertical, data.styleName);
        dim.textOverride = data.textOverride;
        return dim;
    }
}
