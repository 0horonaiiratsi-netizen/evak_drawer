/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { Point } from "./point";
import { Wall } from "./wall";
import { intersectLineWithSegment } from "../utils/intersections";
import { distance } from "../utils/geometry";

const EPSILON = 1e-6;

/**
 * Checks if a point is strictly inside a convex polygon.
 * Points on the boundary are considered outside.
 * @param point The point to check.
 * @param polygon The vertices of the convex polygon, in a consistent CCW order.
 * @returns True if the point is strictly inside.
 */
function isPointStrictlyInConvexPolygon(point: Point, polygon: Point[]): boolean {
    const n = polygon.length;
    for (let i = 0; i < n; i++) {
        const p1 = polygon[i];
        const p2 = polygon[(i + 1) % n];
        // Using cross product. For a CCW polygon, a point is strictly inside if it's to the "left" of all edges.
        // This means all cross products must be > 0.
        const crossProduct = (p2.x - p1.x) * (point.y - p1.y) - (p2.y - p1.y) * (point.x - p1.x);
        if (crossProduct <= EPSILON) { // If it's on or outside an edge, it's not strictly inside.
            return false;
        }
    }
    return true;
}


/**
 * Clips a line segment with a single convex polygon (another wall's rectangle).
 * Returns the parts of the segment that are outside the polygon.
 * @param segment The line segment to clip, as [startPoint, endPoint].
 * @param polygon The clipping polygon.
 * @returns An array of segments that are outside the polygon.
 */
function clipSegmentWithPolygon(segment: [Point, Point], polygon: Point[]): [Point, Point][] {
    const [p1, p2] = segment;
    const intersections: Point[] = [];

    // Find all intersection points of the segment's infinite line with the polygon's edges
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const intersection = intersectLineWithSegment(p1, p2, polygon[j], polygon[i]);
        if (intersection) {
            intersections.push(intersection);
        }
    }

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const lenSq = dx * dx + dy * dy;

    if (lenSq < EPSILON) { // The segment is essentially a point
        return isPointStrictlyInConvexPolygon(p1, polygon) ? [] : [segment];
    }
    
    // Calculate parametric 't' for each intersection point relative to the segment's line
    const tValues = intersections.map(p => 
        ((p.x - p1.x) * dx + (p.y - p1.y) * dy) / lenSq
    );
    
    const allTValues = [0, 1, ...tValues];
    
    const sortedT = allTValues.sort((a, b) => a - b);
    const uniqueT = sortedT.filter((t, i, arr) => i === 0 || t > arr[i-1] + EPSILON);

    const visibleSegments: [Point, Point][] = [];
    for (let i = 0; i < uniqueT.length - 1; i++) {
        const t1 = uniqueT[i];
        const t2 = uniqueT[i+1];
        
        const tMid = (t1 + t2) / 2;
        if (tMid < -EPSILON || tMid > 1 + EPSILON) {
            continue;
        }

        const midPoint = { x: p1.x + tMid * dx, y: p1.y + tMid * dy };

        // If the midpoint of the sub-segment is outside the clipping polygon, it's visible.
        if (!isPointStrictlyInConvexPolygon(midPoint, polygon)) {
            const clampedT1 = Math.max(0, Math.min(1, t1));
            const clampedT2 = Math.max(0, Math.min(1, t2));
            const subP1 = { x: p1.x + clampedT1 * dx, y: p1.y + clampedT1 * dy };
            const subP2 = { x: p1.x + clampedT2 * dx, y: p1.y + clampedT2 * dy };
            
            if (distance(subP1, subP2) > EPSILON) {
                 visibleSegments.push([subP1, subP2]);
            }
        }
    }
    
    return visibleSegments;
}

/**
 * Calculates the final, cleaned-up line segments for a wall's outline,
 * correctly handling T-junctions and L-junctions based on clear rules.
 * @param targetWall The wall to calculate segments for.
 * @param otherWalls All other walls in the scene.
 * @returns An array of line segments [startPoint, endPoint] to be rendered.
 */
export function calculateWallRenderSegments(targetWall: Wall, otherWalls: Wall[]): [Point, Point][] {
    // 1. Get the four outline segments of the target wall and classify them.
    const corners = targetWall.getRectangleCorners();
    const [c1, c2, c3, c4] = corners;
    
    const longSide1: [Point, Point] = [c1, c2];
    const longSide2: [Point, Point] = [c3, c4];
    const endCap1: [Point, Point] = [c4, c1];
    const endCap2: [Point, Point] = [c2, c3];
    
    // Always consider long sides for clipping.
    let segmentsToClipAndRender: [Point, Point][] = [longSide1, longSide2];

    // 2. Process End Caps based on the new rule.
    // An end cap is rendered if it's NOT strictly inside another wall.
    for (const endCap of [endCap1, endCap2]) {
        const [ec1, ec2] = endCap;
        let isStrictlyInsideAnyWall = false;

        for (const otherWall of otherWalls) {
            const otherPolygon = otherWall.getRectangleCorners();
            // Check if both endpoints of the end cap are STRICTLY inside another wall's polygon.
            if (isPointStrictlyInConvexPolygon(ec1, otherPolygon) && isPointStrictlyInConvexPolygon(ec2, otherPolygon)) {
                isStrictlyInsideAnyWall = true;
                break; // This end cap is fully hidden by this wall, no need to check others.
            }
        }

        // If it's not strictly inside ANY other wall, it should be rendered (and clipped).
        // This correctly handles L-junctions where the end cap is on the boundary.
        if (!isStrictlyInsideAnyWall) {
            segmentsToClipAndRender.push(endCap);
        }
    }

    // 3. Clip all collected segments against all other walls.
    // This process cleans up all intersections.
    let finalSegments: [Point, Point][] = segmentsToClipAndRender;
    for (const otherWall of otherWalls) {
        const clippingPolygon = otherWall.getRectangleCorners();
        const nextClippedSegments: [Point, Point][] = [];
        for (const segment of finalSegments) {
            const clippedParts = clipSegmentWithPolygon(segment, clippingPolygon);
            nextClippedSegments.push(...clippedParts);
        }
        finalSegments = nextClippedSegments;
    }

    return finalSegments;
}
