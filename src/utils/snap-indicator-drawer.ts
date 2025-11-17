/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { SnapResult, SnapType } from "../snapping";

/**
 * Draws a visual indicator on the canvas for a given snap result.
 * @param ctx The canvas rendering context.
 * @param result The SnapResult containing the point and type of snap.
 * @param zoom The current canvas zoom level, for scaling the indicator.
 */
export function drawSnapIndicator(ctx: CanvasRenderingContext2D, result: SnapResult | null, zoom: number): void {
    if (!result) return;

    const size = 12 / zoom; // Indicator size in world units
    const halfSize = size / 2;
    const { point, snapType } = result;

    ctx.save();
    const selectionColor = getComputedStyle(document.documentElement).getPropertyValue('--selected-stroke-color');
    ctx.strokeStyle = selectionColor;
    ctx.lineWidth = 2 / zoom;
    ctx.fillStyle = 'rgba(0, 153, 255, 0.2)';

    ctx.beginPath();
    switch (snapType) {
        case SnapType.ENDPOINT:
            ctx.rect(point.x - halfSize, point.y - halfSize, size, size);
            break;
        case SnapType.MIDPOINT:
            ctx.moveTo(point.x, point.y - halfSize);
            ctx.lineTo(point.x + halfSize, point.y + halfSize);
            ctx.lineTo(point.x - halfSize, point.y + halfSize);
            ctx.closePath();
            break;
        case SnapType.CENTER:
            ctx.arc(point.x, point.y, halfSize, 0, 2 * Math.PI);
            break;
        case SnapType.INTERSECTION:
            ctx.moveTo(point.x - halfSize, point.y - halfSize);
            ctx.lineTo(point.x + halfSize, point.y + halfSize);
            ctx.moveTo(point.x - halfSize, point.y + halfSize);
            ctx.lineTo(point.x + halfSize, point.y - halfSize);
            break;
        case SnapType.PERPENDICULAR:
            ctx.moveTo(point.x - halfSize, point.y + halfSize);
            ctx.lineTo(point.x - halfSize, point.y - halfSize);
            ctx.lineTo(point.x + halfSize, point.y - halfSize);
            break;
        case SnapType.QUADRANT:
            ctx.moveTo(point.x, point.y - halfSize);
            ctx.lineTo(point.x + halfSize, point.y);
            ctx.lineTo(point.x, point.y + halfSize);
            ctx.lineTo(point.x - halfSize, point.y);
            ctx.closePath();
            break;
        case SnapType.TANGENT:
            ctx.arc(point.x, point.y, halfSize, 0, 2 * Math.PI);
            ctx.moveTo(point.x - halfSize, point.y - halfSize);
            ctx.lineTo(point.x + halfSize, point.y - halfSize);
            break;
        case SnapType.NEAREST:
            // Hourglass shape
            ctx.moveTo(point.x - halfSize, point.y - halfSize);
            ctx.lineTo(point.x, point.y);
            ctx.lineTo(point.x - halfSize, point.y + halfSize);
            ctx.moveTo(point.x + halfSize, point.y - halfSize);
            ctx.lineTo(point.x, point.y);
            ctx.lineTo(point.x + halfSize, point.y + halfSize);
            break;
    }
    
    ctx.stroke();
    ctx.fill();
    ctx.restore();
}