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

export class AlignedDimensionObject extends DimensionObject {
    constructor(id: number, defPoint1: Point, defPoint2: Point, dimLinePoint: Point, styleName: string = 'Standard') {
        super(id, defPoint1, defPoint2, dimLinePoint, styleName);
    }

    draw(ctx: CanvasRenderingContext2D, isSelected: boolean, zoom: number, allVisibleObjects: readonly SceneObject[], app: App): void {
        const style = app.styleManager.getDimensionStyle(this.styleName) || new DimensionStyle('temp');
        const textStyle = app.styleManager.getTextStyle(style.textStyleName);
        
        const angle = Math.atan2(this.defPoint2.y - this.defPoint1.y, this.defPoint2.x - this.defPoint1.x);
        const measuredDist = distance(this.defPoint1, this.defPoint2);

        ctx.save();
        
        // Move origin to defPoint1 and rotate context
        ctx.translate(this.defPoint1.x, this.defPoint1.y);
        ctx.rotate(angle);

        // Transform dimLinePoint to the rotated coordinate system
        const t_dimLinePoint = { x: this.dimLinePoint.x - this.defPoint1.x, y: this.dimLinePoint.y - this.defPoint1.y };
        const cos_neg = Math.cos(-angle);
        const sin_neg = Math.sin(-angle);
        const rotated_dimLinePoint_y = t_dimLinePoint.x * sin_neg + t_dimLinePoint.y * cos_neg;

        // Now we can use the logic for a horizontal dimension
        const dimLineY = rotated_dimLinePoint_y;
        
        const p1_local = { x: 0, y: 0 };
        const p2_local = { x: measuredDist, y: 0 };

        const dimLineStart = { x: p1_local.x, y: dimLineY };
        const dimLineEnd = { x: p2_local.x, y: dimLineY };

        const dir1 = Math.sign(p1_local.y - dimLineY);
        const extLine1Start = { x: p1_local.x, y: p1_local.y - style.extLineOffset * dir1 };
        const extLine1End = { x: p1_local.x, y: dimLineY - style.extLineExtend * dir1 };

        const dir2 = Math.sign(p2_local.y - dimLineY);
        const extLine2Start = { x: p2_local.x, y: p2_local.y - style.extLineOffset * dir2 };
        const extLine2End = { x: p2_local.x, y: dimLineY - style.extLineExtend * dir2 };

        const dimText = this.textOverride ?? measuredDist.toFixed(style.unitPrecision);
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
        
        const textPadding = 4;
        const textGap = textWidth + textPadding * 2;
        const dimLineLength = measuredDist;
        const textCenter = { x: (dimLineStart.x + dimLineEnd.x) / 2, y: dimLineY };
        
        let textPos = { x: textCenter.x, y: textCenter.y - style.textOffset * Math.sign(dimLineY) };
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        if (Math.sign(dimLineY) < 0) {
            ctx.textBaseline = 'top';
            textPos.y = textCenter.y + style.textOffset;
        }

        // Draw dimension line (with gap for text)
        if (dimLineLength > textGap) {
            const line1End_x = textCenter.x - textGap / 2;
            const line2Start_x = textCenter.x + textGap / 2;
            ctx.beginPath();
            ctx.moveTo(dimLineStart.x, dimLineY);
            ctx.lineTo(line1End_x, dimLineY);
            ctx.moveTo(line2Start_x, dimLineY);
            ctx.lineTo(dimLineEnd.x, dimLineY);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.moveTo(dimLineStart.x, dimLineY);
            ctx.lineTo(dimLineEnd.x, dimLineY);
            ctx.stroke();
            textPos.y -= style.textHeight * Math.sign(dimLineY);
        }

        // Draw text
        ctx.fillText(dimText, textPos.x, textPos.y);

        // Draw arrows
        this.drawArrow(ctx, dimLineStart, Math.PI, style);
        this.drawArrow(ctx, dimLineEnd, 0, style);

        ctx.restore();
    }
    
    clone(newId: number, app?: App): AlignedDimensionObject {
        const newDim = new AlignedDimensionObject(newId, {...this.defPoint1}, {...this.defPoint2}, {...this.dimLinePoint}, this.styleName);
        newDim.textOverride = this.textOverride;
        return newDim;
    }
    
    toJSON(): any {
        return {
            type: 'alignedDimension',
            id: this.id,
            styleName: this.styleName,
            defPoint1: this.defPoint1,
            defPoint2: this.defPoint2,
            dimLinePoint: this.dimLinePoint,
            textOverride: this.textOverride,
        };
    }

    static fromJSON(data: any, app: App): AlignedDimensionObject {
        const dim = new AlignedDimensionObject(data.id, data.defPoint1, data.defPoint2, data.dimLinePoint, data.styleName);
        dim.textOverride = data.textOverride;
        return dim;
    }
}
