/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// Basic type declarations for JSTS (JavaScript Topology Suite)
// This is not a complete definition file but covers the essentials for our use case.

declare namespace jsts {
    namespace geom {
        class Coordinate {
            constructor(x: number, y: number);
            x: number;
            y: number;
        }

        class Geometry {
            getArea(): number;
            getCoordinates(): Coordinate[];
            getGeometryType(): 'Point' | 'LineString' | 'LinearRing' | 'Polygon' | 'MultiPoint' | 'MultiLineString' | 'MultiPolygon' | 'GeometryCollection';
            isEmpty(): boolean;
            // Add other common methods as needed
            intersection(other: Geometry): Geometry;
            union(other: Geometry): Geometry;
            difference(other: Geometry): Geometry;
            buffer(distance: number): Geometry;
            // ...
        }

        class Polygon extends Geometry {
            getExteriorRing(): LinearRing;
        }

        class LinearRing extends Geometry {}
        class LineString extends Geometry {}
        class Point extends Geometry {}

        class GeometryFactory {
            createPoint(coordinate: Coordinate): Point;
            createPolygon(shell: LinearRing, holes?: LinearRing[]): Polygon;
            createLinearRing(coordinates: Coordinate[]): LinearRing;
            createLineString(coordinates: Coordinate[]): LineString;
        }
    }
}