/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { SceneObject } from "../scene/scene-object";
import { GeometryService } from "./geometry-service";
import { Point } from "../scene/point";

export interface CollisionResult {
    objectA: SceneObject;
    objectB: SceneObject;
    intersecting: boolean;
    intersectionPoints?: Point[];
}

export class CollisionService {
    private geometryService: GeometryService;

    constructor(geometryService: GeometryService) {
        this.geometryService = geometryService;
    }

    // Check bounding box collision (fast preliminary check)
    checkBoundingBoxCollision(objA: SceneObject, objB: SceneObject): boolean {
        const bboxA = objA.getBoundingBox();
        const bboxB = objB.getBoundingBox();

        return !(bboxA.maxX < bboxB.minX || bboxA.minX > bboxB.maxX ||
                 bboxA.maxY < bboxB.minY || bboxA.minY > bboxB.maxY);
    }

    // Check detailed collision using JSTS
    checkDetailedCollision(objA: SceneObject, objB: SceneObject): CollisionResult {
        // For now, assume objects have methods to convert to JSTS geometries
        // This would need to be extended for each object type
        const geomA = this.convertToJstsGeometry(objA);
        const geomB = this.convertToJstsGeometry(objB);

        if (!geomA || !geomB) {
            return { objectA: objA, objectB: objB, intersecting: false };
        }

        const intersection = this.geometryService.getIntersection(geomA, geomB);
        const intersecting = !intersection.isEmpty();

        return {
            objectA: objA,
            objectB: objB,
            intersecting,
            intersectionPoints: intersecting ? this.extractPointsFromGeometry(intersection) : undefined
        };
    }

    private convertToJstsGeometry(obj: SceneObject): jsts.geom.Geometry | null {
        // Placeholder: implement conversion for specific object types
        // For example, if obj is Wall, use geometryService.createPolygonFromWall
        // This needs to be expanded for all relevant types
        console.warn('convertToJstsGeometry not fully implemented for', obj.constructor.name);
        return null;
    }

    private extractPointsFromGeometry(geometry: jsts.geom.Geometry): Point[] {
        const coords = geometry.getCoordinates();
        return coords.map(c => ({ x: c.x, y: c.y }));
    }

    // Check collisions for a list of objects
    checkCollisions(objects: SceneObject[]): CollisionResult[] {
        const results: CollisionResult[] = [];
        for (let i = 0; i < objects.length; i++) {
            for (let j = i + 1; j < objects.length; j++) {
                if (this.checkBoundingBoxCollision(objects[i], objects[j])) {
                    results.push(this.checkDetailedCollision(objects[i], objects[j]));
                }
            }
        }
        return results;
    }

    // Visualize collision highlights
    highlightCollisions(ctx: CanvasRenderingContext2D, collisions: CollisionResult[], zoom: number) {
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2 / zoom;
        ctx.setLineDash([4 / zoom, 2 / zoom]);

        collisions.forEach(collision => {
            if (collision.intersecting && collision.intersectionPoints) {
                collision.intersectionPoints.forEach(point => {
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, 5 / zoom, 0, 2 * Math.PI);
                    ctx.stroke();
                });
            }
        });

        ctx.setLineDash([]);
    }
}
