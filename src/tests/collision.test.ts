/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CollisionService } from '../services/collision-service';
import { GeometryService } from '../services/geometry-service';
import { Wall, WallType } from '../scene/wall';

describe('CollisionService', () => {
    let geometryService: GeometryService;
    let collisionService: CollisionService;

    beforeEach(() => {
        // Mock jsts globally
        const GeometryFactoryMock = vi.fn(function() {
            this.createPolygon = vi.fn();
            this.createLineString = vi.fn();
            this.createLinearRing = vi.fn();
            this.createCoordinate = vi.fn();
        });
        global.jsts = {
            geom: {
                GeometryFactory: GeometryFactoryMock,
            },
        } as any;

        // Skip GeometryService constructor mocking for now - focus on bounding box tests

        geometryService = new GeometryService();
        collisionService = new CollisionService(geometryService);
    });

    it('should detect bounding box collision', () => {
        const wall1 = new Wall(1, { x: 0, y: 0 }, { x: 10, y: 10 }, WallType.EXTERIOR);
        const wall2 = new Wall(2, { x: 5, y: 5 }, { x: 15, y: 15 }, WallType.EXTERIOR);

        // Mock getBoundingBox to return overlapping boxes
        wall1.getBoundingBox = vi.fn().mockReturnValue({ minX: 0, minY: 0, maxX: 10, maxY: 10 });
        wall2.getBoundingBox = vi.fn().mockReturnValue({ minX: 5, minY: 5, maxX: 15, maxY: 15 });

        const colliding = collisionService.checkBoundingBoxCollision(wall1, wall2);
        expect(colliding).toBe(true);
    });

    it('should not detect bounding box collision when objects are far apart', () => {
        const wall1 = new Wall(1, { x: 0, y: 0 }, { x: 10, y: 10 }, WallType.EXTERIOR);
        const wall2 = new Wall(2, { x: 50, y: 50 }, { x: 60, y: 60 }, WallType.EXTERIOR);

        // Mock getBoundingBox to return non-overlapping boxes
        wall1.getBoundingBox = vi.fn().mockReturnValue({ minX: 0, minY: 0, maxX: 10, maxY: 10 });
        wall2.getBoundingBox = vi.fn().mockReturnValue({ minX: 50, minY: 50, maxX: 60, maxY: 60 });

        const colliding = collisionService.checkBoundingBoxCollision(wall1, wall2);
        expect(colliding).toBe(false);
    });

    // Note: Detailed collision tests would require full JSTS geometry conversion
    // which is not implemented in this placeholder
});
