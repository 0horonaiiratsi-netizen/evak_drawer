/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// Minimal type declarations for csg.js, loaded via CDN.
// This allows basic interaction with the library from TypeScript.

declare class CSG {
    polygons: CSG.Polygon[];
    static fromPolygons(polygons: CSG.Polygon[]): CSG;
    clone(): CSG;
    union(csg: CSG): CSG;
    subtract(csg: CSG): CSG;
    intersect(csg: CSG): CSG;
    inverse(): CSG;

    // Helper to convert from a THREE.Geometry (which is deprecated but works with this library)
    static fromGeometry(three_geometry: any): CSG;
    // Helper to convert back to a THREE.Geometry
    toGeometry(): any;
}

declare namespace CSG {
    class Vector {
        x: number;
        y: number;
        z: number;
        constructor(x: number, y: number, z: number);
        clone(): Vector;
    }
    class Vertex {
        pos: Vector;
        normal: Vector;
        constructor(pos: Vector, normal: Vector);
        clone(): Vertex;
    }
    class Polygon {
        vertices: Vertex[];
        shared: any;
        plane: Plane;
        constructor(vertices: Vertex[], shared?: any);
        clone(): Polygon;
    }
    class Plane {}
}
