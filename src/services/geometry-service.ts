/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { Wall } from "../scene/wall";
import { PolylineObject } from "../scene/polyline-object";

/**
 * A service that acts as a facade/adapter for the JSTS (JavaScript Topology Suite) library.
 * It provides methods to convert our application's scene objects into JSTS geometries
 * and will host high-level geometric operations (union, intersection, etc.).
 */
export class GeometryService {
    private geometryFactory: jsts.geom.GeometryFactory;

    constructor() {
        if (typeof jsts === 'undefined') {
            throw new Error("JSTS library is not loaded. Please check index.html.");
        }
        this.geometryFactory = new jsts.geom.GeometryFactory();
    }

    /**
     * Converts a Wall object into a JSTS Polygon geometry.
     * @param wall The Wall object to convert.
     * @returns A JSTS Polygon representing the wall's rectangular shape.
     */
    public createPolygonFromWall(wall: Wall): jsts.geom.Polygon {
        const corners = wall.getRectangleCorners();
        // A LinearRing in JSTS must have its first and last points be the same.
        const coordinates = corners.map(p => new jsts.geom.Coordinate(p.x, p.y));
        coordinates.push(coordinates[0]); // Close the ring

        const shell = this.geometryFactory.createLinearRing(coordinates);
        return this.geometryFactory.createPolygon(shell);
    }
    
    public createLineStringFromPolyline(polyline: PolylineObject): jsts.geom.LineString {
        const coordinates = polyline.points.map(p => new jsts.geom.Coordinate(p.x, p.y));
        return this.geometryFactory.createLineString(coordinates);
    }
    
    public createPolygonFromPolyline(polyline: PolylineObject): jsts.geom.Polygon {
        const coordinates = polyline.points.map(p => new jsts.geom.Coordinate(p.x, p.y));
        if (polyline.isClosed) {
            const first = coordinates[0];
            const last = coordinates[coordinates.length - 1];
            if (!first || !last || first.x !== last.x || first.y !== last.y) {
                 coordinates.push(coordinates[0]);
            }
        }
        const shell = this.geometryFactory.createLinearRing(coordinates);
        return this.geometryFactory.createPolygon(shell);
    }

    public createPolylineFromJstsGeometry(id: number, geometry: jsts.geom.Geometry): PolylineObject | null {
        // JSTS buffer can return Polygon or MultiPolygon. Let's handle the simple Polygon case.
        if (geometry.getGeometryType() === 'Polygon') {
            const polygon = geometry as jsts.geom.Polygon;
            const exteriorRing = polygon.getExteriorRing();
            if (!exteriorRing || exteriorRing.isEmpty()) return null;

            const coords = exteriorRing.getCoordinates().map(c => ({ x: c.x, y: c.y }));
            
            // JSTS rings are closed, so first and last points are the same. Remove the last one.
            if (coords.length > 1 && coords[0].x === coords[coords.length-1].x && coords[0].y === coords[coords.length-1].y) {
                coords.pop();
            }
            return new PolylineObject(id, coords, true); // The result of a buffer is always a closed shape
        } else if (geometry.getGeometryType() === 'LineString') {
            const lineString = geometry as jsts.geom.LineString;
            const coords = lineString.getCoordinates().map(c => ({ x: c.x, y: c.y }));
            return new PolylineObject(id, coords, false);
        }
        console.warn(`Cannot convert JSTS geometry of type ${geometry.getGeometryType()} to PolylineObject.`);
        return null;
    }

    /**
     * Calculates the geometric intersection of two JSTS geometries.
     * @param geomA The first geometry.
     * @param geomB The second geometry.
     * @returns The resulting intersection geometry.
     */
    public getIntersection(geomA: jsts.geom.Geometry, geomB: jsts.geom.Geometry): jsts.geom.Geometry {
        return geomA.intersection(geomB);
    }

    /**
     * Calculates the geometric union of two JSTS geometries.
     * @param geomA The first geometry.
     * @param geomB The second geometry.
     * @returns The resulting union geometry.
     */
    public getUnion(geomA: jsts.geom.Geometry, geomB: jsts.geom.Geometry): jsts.geom.Geometry {
        return geomA.union(geomB);
    }

    /**
     * Creates a buffer area around a geometry.
     * @param geom The geometry to buffer.
     * @param distance The buffer distance.
     * @returns The resulting buffer geometry.
     */
    public createBuffer(geom: jsts.geom.Geometry, distance: number): jsts.geom.Geometry {
        return geom.buffer(distance);
    }
}