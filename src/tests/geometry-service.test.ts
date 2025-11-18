import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeometryService } from '../services/geometry-service';
import { Wall } from '../scene/wall';
import { PolylineObject } from '../scene/polyline-object';

describe('GeometryService', () => {
    let geometryService: GeometryService;

    beforeEach(() => {
        // Mock global jsts
        (global as any).jsts = {
            geom: {
                GeometryFactory: class {
                    createLinearRing = vi.fn().mockReturnValue({
                        getCoordinates: vi.fn().mockReturnValue([]),
                    });
                    createPolygon = vi.fn().mockReturnValue({
                        getGeometryType: () => 'Polygon',
                    });
                    createLineString = vi.fn().mockReturnValue({
                        getGeometryType: () => 'LineString',
                    });
                },
                Coordinate: class {
                    x: number;
                    y: number;
                    constructor(x, y) {
                        this.x = x;
                        this.y = y;
                    }
                },
                Polygon: class {},
                LineString: class {},
            },
        };

        geometryService = new GeometryService();
    });

    afterEach(() => {
        delete global.jsts;
    });

    it('should create polygon from wall', () => {
        const wall = new Wall(1, { x: 0, y: 0 }, { x: 10, y: 5 });
        const polygon = geometryService.createPolygonFromWall(wall);

        expect(polygon).toBeDefined();
        expect(polygon.getGeometryType).toBeDefined();
    });

    it('should create line string from polyline', () => {
        const polyline = new PolylineObject(1, [{ x: 0, y: 0 }, { x: 10, y: 0 }], false);
        const lineString = geometryService.createLineStringFromPolyline(polyline);

        expect(lineString).toBeDefined();
        expect(lineString.getGeometryType()).toBe('LineString');
    });

    it('should create polygon from closed polyline', () => {
        const polyline = new PolylineObject(1, [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }], true);
        const polygon = geometryService.createPolygonFromPolyline(polyline);

        expect(polygon).toBeDefined();
        expect(polygon.getGeometryType()).toBe('Polygon');
    });

    it('should create polyline from JSTS polygon', () => {
        const mockPolygon = {
            getGeometryType: () => 'Polygon',
            getExteriorRing: () => ({
                getCoordinates: () => [
                    { x: 0, y: 0 },
                    { x: 10, y: 0 },
                    { x: 10, y: 10 },
                    { x: 0, y: 10 },
                    { x: 0, y: 0 },
                ],
                isEmpty: () => false,
            }),
        } as any;

        const polyline = geometryService.createPolylineFromJstsGeometry(1, mockPolygon);

        expect(polyline).toBeInstanceOf(PolylineObject);
        expect(polyline.isClosed).toBe(true);
        expect(polyline.points.length).toBe(4);
    });

    it('should create polyline from JSTS line string', () => {
        const mockLineString = {
            getGeometryType: () => 'LineString',
            getCoordinates: () => [
                { x: 0, y: 0 },
                { x: 10, y: 0 },
            ],
        } as any;

        const polyline = geometryService.createPolylineFromJstsGeometry(1, mockLineString);

        expect(polyline).toBeInstanceOf(PolylineObject);
        expect(polyline.isClosed).toBe(false);
        expect(polyline.points.length).toBe(2);
    });

    it('should get intersection of two geometries', () => {
        const mockGeomA = { intersection: vi.fn().mockReturnValue({}) } as any;
        const mockGeomB = {} as any;

        const result = geometryService.getIntersection(mockGeomA, mockGeomB);

        expect(result).toBeDefined();
        expect(mockGeomA.intersection).toHaveBeenCalledWith(mockGeomB);
    });

    it('should get union of two geometries', () => {
        const mockGeomA = { union: vi.fn().mockReturnValue({}) } as any;
        const mockGeomB = {} as any;

        const result = geometryService.getUnion(mockGeomA, mockGeomB);

        expect(result).toBeDefined();
        expect(mockGeomA.union).toHaveBeenCalledWith(mockGeomB);
    });

    it('should create buffer around geometry', () => {
        const mockGeom = { buffer: vi.fn().mockReturnValue({}) } as any;
        const distance = 5;

        const result = geometryService.createBuffer(mockGeom, distance);

        expect(result).toBeDefined();
        expect(mockGeom.buffer).toHaveBeenCalledWith(distance);
    });
});
