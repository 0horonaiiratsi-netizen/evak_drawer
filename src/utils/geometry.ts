/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { Point } from "../scene/point";
import { SceneObject } from "../scene/scene-object";
import { Wall } from "../scene/wall";
import { ANGLE_SNAP_INCREMENT, GRID_SIZE_MINOR } from "../constants";
import { SnapResult, SnapType } from "../snapping";
import { lineLineIntersection } from "./intersections";
import { PolylineObject } from "../scene/polyline-object";
import { ArcObject } from "../scene/arc-object";
import { CircleObject } from "../scene/circle-object";

export function distance(p1: Point, p2: Point): number { 
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2)); 
}

export function snapToGrid(point: Point): Point {
    return { 
        x: Math.round(point.x / GRID_SIZE_MINOR) * GRID_SIZE_MINOR, 
        y: Math.round(point.y / GRID_SIZE_MINOR) * GRID_SIZE_MINOR 
    };
}

export function snapToAngle(startPoint: Point, endPoint: Point): Point {
    const angle = Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x);
    const snappedAngle = Math.round(angle / ANGLE_SNAP_INCREMENT) * ANGLE_SNAP_INCREMENT;
    const dist = distance(startPoint, endPoint);
    return { 
        x: startPoint.x + Math.cos(snappedAngle) * dist, 
        y: startPoint.y + Math.sin(snappedAngle) * dist 
    };
}

export function snapToOrtho(startPoint: Point, currentPoint: Point): Point {
    const dx = Math.abs(currentPoint.x - startPoint.x);
    const dy = Math.abs(currentPoint.y - startPoint.y);

    if (dx > dy) {
        // Snap horizontally
        return { x: currentPoint.x, y: startPoint.y };
    } else {
        // Snap vertically
        return { x: startPoint.x, y: currentPoint.y };
    }
}

/**
 * Calculates the closest point on an infinite line (defined by l1 and l2) to a given point p.
 * @param p The point to find the closest point to.
 * @param l1 The first point defining the line.
 * @param l2 The second point defining the line.
 * @returns The closest point on the line to p.
 */
export function getClosestPointOnLine(p: Point, l1: Point, l2: Point): Point {
    const dx = l2.x - l1.x;
    const dy = l2.y - l1.y;

    // Handle case where l1 and l2 are the same point
    if (dx === 0 && dy === 0) {
        return l1;
    }

    const t = ((p.x - l1.x) * dx + (p.y - l1.y) * dy) / (dx * dx + dy * dy);

    return {
        x: l1.x + t * dx,
        y: l1.y + t * dy
    };
}


/**
 * Calculates the closest point on a line segment to a given point.
 * @param p The point.
 * @param a The start point of the segment.
 * @param b The end point of the segment.
 * @returns The closest point on the segment.
 */
function getClosestPointOnSegment(p: Point, a: Point, b: Point): Point {
    const dx = b.x - a.x;
    const dy = b.y - a.y;

    if (dx === 0 && dy === 0) {
        return a;
    }
    
    const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy);
    const clampedT = Math.max(0, Math.min(1, t));

    return {
        x: a.x + clampedT * dx,
        y: a.y + clampedT * dy,
    };
}


export function findClosestWall(point: Point, sceneObjects: readonly SceneObject[], tolerance: number): { wall: Wall, closestPoint: Point } | null {
    let closestDistance = Infinity;
    let result: { wall: Wall, closestPoint: Point } | null = null;
    const walls = sceneObjects.filter(obj => obj instanceof Wall) as Wall[];

    for (const wall of walls) {
        const dx = wall.p2.x - wall.p1.x;
        const dy = wall.p2.y - wall.p1.y;
        
        if (dx === 0 && dy === 0) continue; // Skip zero-length walls

        const t = ((point.x - wall.p1.x) * dx + (point.y - wall.p1.y) * dy) / (dx * dx + dy * dy);
        const clampedT = Math.max(0, Math.min(1, t));
        const closestPoint = { x: wall.p1.x + clampedT * dx, y: wall.p1.y + clampedT * dy };
        const dist = distance(point, closestPoint);
        
        if (dist < closestDistance) {
            closestDistance = dist;
            result = { wall, closestPoint };
        }
    }
    
    return closestDistance < tolerance ? result : null;
}

export function findClosestSnapPoint(
    point: Point,
    sceneObjects: readonly SceneObject[],
    tolerance: number,
    snapModes: Map<SnapType, boolean>,
    objectToExclude?: SceneObject,
    contextPoint?: Point
): SnapResult | null {
    let closestSnap: SnapResult | null = null;
    let minDistance = tolerance;

    const objectsToScan = sceneObjects.filter(obj => obj.id !== objectToExclude?.id);

    const checkPoint = (p: Point, type: SnapType, obj: SceneObject) => {
        const dist = distance(point, p);
        if (dist < minDistance) {
            minDistance = dist;
            closestSnap = { point: p, snapType: type, object: obj };
        }
    };

    // --- Point-based snaps ---
    for (const obj of objectsToScan) {
        if (snapModes.get(SnapType.CENTER)) {
            checkPoint(obj.getCenter(), SnapType.CENTER, obj);
        }

        if (obj instanceof Wall) {
            if (snapModes.get(SnapType.ENDPOINT)) {
                checkPoint(obj.p1, SnapType.ENDPOINT, obj);
                checkPoint(obj.p2, SnapType.ENDPOINT, obj);
                obj.getRectangleCorners().forEach(p => checkPoint(p, SnapType.ENDPOINT, obj));
            }
            if (snapModes.get(SnapType.MIDPOINT)) {
                // Centerline midpoint
                checkPoint({ x: (obj.p1.x + obj.p2.x) / 2, y: (obj.p1.y + obj.p2.y) / 2 }, SnapType.MIDPOINT, obj);
                // Outline midpoints
                const corners = obj.getRectangleCorners();
                for (let i = 0; i < 4; i++) {
                    const p1 = corners[i];
                    const p2 = corners[(i + 1) % 4];
                    checkPoint({ x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }, SnapType.MIDPOINT, obj);
                }
            }
        } else if (obj instanceof PolylineObject) {
            if (snapModes.get(SnapType.ENDPOINT)) {
                obj.points.forEach(p => checkPoint(p, SnapType.ENDPOINT, obj));
            }
            if (snapModes.get(SnapType.MIDPOINT)) {
                for (let i = 0; i < obj.points.length - 1; i++) {
                    checkPoint({ x: (obj.points[i].x + obj.points[i + 1].x) / 2, y: (obj.points[i].y + obj.points[i + 1].y) / 2 }, SnapType.MIDPOINT, obj);
                }
            }
        } else if (obj instanceof ArcObject) {
            if (snapModes.get(SnapType.ENDPOINT)) {
                checkPoint(obj.getStartPoint(), SnapType.ENDPOINT, obj);
                checkPoint(obj.getEndPoint(), SnapType.ENDPOINT, obj);
            }
            if (snapModes.get(SnapType.MIDPOINT)) {
                checkPoint(obj.getMidPoint(), SnapType.MIDPOINT, obj);
            }
        } else if (snapModes.get(SnapType.ENDPOINT) && 'getRectangleCorners' in obj && typeof obj.getRectangleCorners === 'function') {
             (obj as any).getRectangleCorners().forEach((p: Point) => checkPoint(p, SnapType.ENDPOINT, obj));
        }
    }

    // --- Intersection snap ---
    if (snapModes.get(SnapType.INTERSECTION)) {
        // Collect all line segments from relevant objects (Walls, Polylines)
        const allSegmentsWithSource: { obj: SceneObject, segment: [Point, Point] }[] = [];
        objectsToScan.forEach(obj => {
            if (obj instanceof Wall) {
                const corners = obj.getRectangleCorners();
                allSegmentsWithSource.push({ obj, segment: [corners[0], corners[1]] });
                allSegmentsWithSource.push({ obj, segment: [corners[1], corners[2]] });
                allSegmentsWithSource.push({ obj, segment: [corners[2], corners[3]] });
                allSegmentsWithSource.push({ obj, segment: [corners[3], corners[0]] });
            } else if (obj instanceof PolylineObject) {
                for (let i = 0; i < obj.points.length - 1; i++) {
                    allSegmentsWithSource.push({ obj, segment: [obj.points[i], obj.points[i + 1]] });
                }
                if (obj.isClosed && obj.points.length > 1) {
                    allSegmentsWithSource.push({ obj, segment: [obj.points[obj.points.length - 1], obj.points[0]] });
                }
            }
        });

        // Check for intersections between all collected segments from different objects
        for (let i = 0; i < allSegmentsWithSource.length; i++) {
            for (let j = i + 1; j < allSegmentsWithSource.length; j++) {
                const item1 = allSegmentsWithSource[i];
                const item2 = allSegmentsWithSource[j];

                // Don't intersect segments from the same object
                if (item1.obj.id === item2.obj.id) continue;

                const intersection = lineLineIntersection(item1.segment[0], item1.segment[1], item2.segment[0], item2.segment[1]);
                if (intersection) {
                    checkPoint(intersection, SnapType.INTERSECTION, item1.obj);
                }
            }
        }
    }

    // --- Perpendicular snap ---
    if (snapModes.get(SnapType.PERPENDICULAR) && contextPoint) {
        for (const obj of objectsToScan) {
            let segments: [Point, Point][] = [];
            if (obj instanceof Wall) {
                const corners = obj.getRectangleCorners();
                segments.push(
                    [corners[0], corners[1]], [corners[1], corners[2]],
                    [corners[2], corners[3]], [corners[3], corners[0]]
                );
            } else if (obj instanceof PolylineObject) {
                for (let i = 0; i < obj.points.length - 1; i++) {
                    segments.push([obj.points[i], obj.points[i + 1]]);
                }
                if (obj.isClosed && obj.points.length > 1) {
                    segments.push([obj.points[obj.points.length - 1], obj.points[0]]);
                }
            }

            for (const seg of segments) {
                const perpPoint = getClosestPointOnLine(contextPoint, seg[0], seg[1]);
                checkPoint(perpPoint, SnapType.PERPENDICULAR, obj);
            }
        }
    }
    
    // --- Quadrant Snap ---
    if (snapModes.get(SnapType.QUADRANT)) {
        for (const obj of objectsToScan) {
            if (obj instanceof CircleObject) {
                obj.getSnapPoints().slice(1).forEach(p => checkPoint(p, SnapType.QUADRANT, obj));
            } else if (obj instanceof ArcObject) {
                const center = obj.center;
                const radius = obj.radius;
                const quadrantPoints = [
                    { x: center.x + radius, y: center.y },
                    { x: center.x, y: center.y - radius },
                    { x: center.x - radius, y: center.y },
                    { x: center.x, y: center.y + radius },
                ];
                quadrantPoints.forEach(p => {
                    const angle = Math.atan2(p.y - center.y, p.x - center.x);
                    if (obj.isAngleOnArc(angle)) {
                        checkPoint(p, SnapType.QUADRANT, obj);
                    }
                });
            }
        }
    }
    
    // --- Tangent Snap ---
    if (snapModes.get(SnapType.TANGENT) && contextPoint) {
        for (const obj of objectsToScan) {
            if (obj instanceof CircleObject || obj instanceof ArcObject) {
                const c1 = obj.center;
                const r1 = obj.radius;
                const D = distance(contextPoint, c1);
    
                if (D <= r1 + 1e-6) continue; // contextPoint is inside or on the circle, no tangents
    
                const a = (r1 * r1) / D;
                const h = Math.sqrt(r1*r1 - a*a);
    
                const p_mid = { 
                    x: c1.x + a * (contextPoint.x - c1.x) / D,
                    y: c1.y + a * (contextPoint.y - c1.y) / D
                };
    
                const t1 = {
                    x: p_mid.x + h * (contextPoint.y - c1.y) / D,
                    y: p_mid.y - h * (contextPoint.x - c1.x) / D,
                };
                const t2 = {
                    x: p_mid.x - h * (contextPoint.y - c1.y) / D,
                    y: p_mid.y + h * (contextPoint.x - c1.x) / D,
                };
                
                if (obj instanceof ArcObject) {
                    if (obj.isAngleOnArc(Math.atan2(t1.y - c1.y, t1.x - c1.x))) checkPoint(t1, SnapType.TANGENT, obj);
                    if (obj.isAngleOnArc(Math.atan2(t2.y - c1.y, t2.x - c1.x))) checkPoint(t2, SnapType.TANGENT, obj);
                } else {
                    checkPoint(t1, SnapType.TANGENT, obj);
                    checkPoint(t2, SnapType.TANGENT, obj);
                }
            }
        }
    }

    // --- Nearest Snap ---
    if (snapModes.get(SnapType.NEAREST)) {
        for (const obj of objectsToScan) {
            let nearestPoint: Point | null = null;
            if (obj instanceof Wall) {
                nearestPoint = getClosestPointOnSegment(point, obj.p1, obj.p2);
            } else if (obj instanceof PolylineObject) {
                let minDist = Infinity;
                for (let i = 0; i < obj.points.length - 1; i++) {
                    const p = getClosestPointOnSegment(point, obj.points[i], obj.points[i+1]);
                    const d = distance(point, p);
                    if (d < minDist) {
                        minDist = d;
                        nearestPoint = p;
                    }
                }
                if (obj.isClosed && obj.points.length > 1) {
                    const p = getClosestPointOnSegment(point, obj.points[obj.points.length - 1], obj.points[0]);
                    const d = distance(point, p);
                     if (d < minDist) {
                        minDist = d;
                        nearestPoint = p;
                    }
                }
            } else if (obj instanceof CircleObject) {
                const angle = Math.atan2(point.y - obj.center.y, point.x - obj.center.x);
                nearestPoint = {
                    x: obj.center.x + obj.radius * Math.cos(angle),
                    y: obj.center.y + obj.radius * Math.sin(angle),
                };
            } else if (obj instanceof ArcObject) {
                const angle = Math.atan2(point.y - obj.center.y, point.x - obj.center.x);
                if (obj.isAngleOnArc(angle)) {
                    nearestPoint = {
                        x: obj.center.x + obj.radius * Math.cos(angle),
                        y: obj.center.y + obj.radius * Math.sin(angle),
                    };
                } else {
                    const d1 = distance(point, obj.getStartPoint());
                    const d2 = distance(point, obj.getEndPoint());
                    nearestPoint = d1 < d2 ? obj.getStartPoint() : obj.getEndPoint();
                }
            }
            if (nearestPoint) {
                checkPoint(nearestPoint, SnapType.NEAREST, obj);
            }
        }
    }


    return closestSnap;
}

export function getCircleCenterFromThreePoints(p1: Point, p2: Point, p3: Point): Point | null {
    const D = 2 * (p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y));
    if (Math.abs(D) < 1e-8) { // Points are collinear
        return null;
    }
    const p1sq = p1.x * p1.x + p1.y * p1.y;
    const p2sq = p2.x * p2.x + p2.y * p2.y;
    const p3sq = p3.x * p3.x + p3.y * p3.y;

    const Ux = (p1sq * (p2.y - p3.y) + p2sq * (p3.y - p1.y) + p3sq * (p1.y - p2.y)) / D;
    const Uy = (p1sq * (p3.x - p2.x) + p2sq * (p1.x - p3.x) + p3sq * (p2.x - p1.x)) / D;
    return { x: Ux, y: Uy };
}