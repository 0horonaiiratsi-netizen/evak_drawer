/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { Point } from "../scene/point";
import { distance } from "./geometry";

/**
 * Calculates the reflection of a point across a line defined by two other points.
 * @param point The point to reflect.
 * @param lineP1 The first point of the reflection line.
 * @param lineP2 The second point of the reflection line.
 * @returns The reflected point.
 */
export function reflectPoint(point: Point, lineP1: Point, lineP2: Point): Point {
    const dx = lineP2.x - lineP1.x;
    const dy = lineP2.y - lineP1.y;

    if (dx === 0 && dy === 0) {
        // The line is a point, cannot reflect. Return original point.
        return { ...point };
    }

    const a = (dx * dx - dy * dy) / (dx * dx + dy * dy);
    const b = (2 * dx * dy) / (dx * dx + dy * dy);

    const x = a * (point.x - lineP1.x) + b * (point.y - lineP1.y) + lineP1.x;
    const y = b * (point.x - lineP1.x) - a * (point.y - lineP1.y) + lineP1.y;

    return { x, y };
}

/**
 * Calculates the intersection point of two line segments.
 * @param p1 Start point of line segment 1.
 * @param p2 End point of line segment 1.
 * @param p3 Start point of line segment 2.
 * @param p4 End point of line segment 2.
 * @returns The intersection point, or null if they do not intersect on the segments.
 */
export function lineLineIntersection(p1: Point, p2: Point, p3: Point, p4: Point): Point | null {
    const den = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
    if (den === 0) {
        return null; // Parallel or collinear
    }

    const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / den;
    const u = -((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) / den;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        return {
            x: p1.x + t * (p2.x - p1.x),
            y: p1.y + t * (p2.y - p1.y),
        };
    }

    return null; // No intersection on segments
}

/**
 * Calculates the intersection point of an infinite line and a line segment.
 * @param lineP1 A point on the infinite line.
 * @param lineP2 Another point on the infinite line.
 * @param segP1 The start point of the line segment.
 * @param segP2 The end point of the line segment.
 * @returns The intersection point, or null if they do not intersect on the segment.
 */
export function intersectLineWithSegment(lineP1: Point, lineP2: Point, segP1: Point, segP2: Point): Point | null {
    const den = (lineP1.x - lineP2.x) * (segP1.y - segP2.y) - (lineP1.y - lineP2.y) * (segP1.x - segP2.x);
    const EPSILON = 1e-9;

    if (Math.abs(den) < EPSILON) {
        return null; // Parallel or collinear
    }

    const t = ((lineP1.x - segP1.x) * (segP1.y - segP2.y) - (lineP1.y - segP1.y) * (segP1.x - segP2.x)) / den;
    const u = -((lineP1.x - lineP2.x) * (lineP1.y - segP1.y) - (lineP1.y - lineP2.y) * (lineP1.x - segP1.x)) / den;

    // u must be between 0 and 1 for an intersection on the segment.
    if (u >= -EPSILON && u <= 1 + EPSILON) {
        return {
            x: lineP1.x + t * (lineP2.x - lineP1.x),
            y: lineP1.y + t * (lineP2.y - lineP1.y),
        };
    }

    return null; // No intersection on segment
}


/**
 * Calculates the intersection point of two infinite lines.
 * @param p1 A point on line 1.
 * @param p2 Another point on line 1.
 * @param p3 A point on line 2.
 * @param p4 Another point on line 2.
 * @returns The intersection point, or null if they are parallel.
 */
export function infiniteLineLineIntersection(p1: Point, p2: Point, p3: Point, p4: Point): Point | null {
    const den = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
    if (Math.abs(den) < 1e-9) {
        return null; // Parallel or collinear
    }
    const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / den;
    
    return {
        x: p1.x + t * (p2.x - p1.x),
        y: p1.y + t * (p2.y - p1.y),
    };
}

/**
 * Normalizes a vector (point treated as a vector from origin).
 * @param v The vector to normalize.
 * @returns A new normalized vector.
 */
export function normalizeVector(v: Point): Point {
    const len = Math.sqrt(v.x * v.x + v.y * v.y);
    if (len === 0) return { x: 0, y: 0 };
    return { x: v.x / len, y: v.y / len };
}