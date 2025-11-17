/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { Grip, GripType } from "../grips";

/**
 * Renders a single grip on the canvas with a style appropriate for its type and state.
 * @param ctx The canvas rendering context.
 * @param grip The grip object to draw.
 * @param zoom The current canvas zoom level.
 * @param isHovered True if the mouse is currently over this grip.
 * @param isHot True if this grip is the active one for an operation.
 */
export function drawGrip(ctx: CanvasRenderingContext2D, grip: Grip, zoom: number, isHovered: boolean = false, isHot: boolean = false) {
    const size = 8 / zoom; // Grip size in world units for a consistent screen size
    const halfSize = size / 2;
    const { point, type } = grip;

    ctx.save();
    
    const selectionColor = getComputedStyle(document.documentElement).getPropertyValue('--selected-stroke-color');
    const hotColor = '#D13438'; // A distinct red for the active grip

    ctx.strokeStyle = selectionColor;
    ctx.lineWidth = 1 / zoom;

    if (isHot) {
        ctx.fillStyle = hotColor;
    } else if (isHovered) {
        ctx.fillStyle = selectionColor;
    } else {
        ctx.fillStyle = 'rgba(0, 153, 255, 0.6)'; // "Cold" grip color
    }

    ctx.beginPath();
    // In AutoCAD, all grips are squares. Let's adopt this for consistency,
    // as the action is communicated via the command line / status bar now.
    ctx.rect(point.x - halfSize, point.y - halfSize, size, size);
    
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}