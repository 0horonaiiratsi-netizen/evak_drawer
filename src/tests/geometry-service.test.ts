/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { suite, test, assert, assertAlmostEqual, assertEqual } from '../utils/test-runner';
import { GeometryService } from '../services/geometry-service';
import { Wall, WallType, WALL_THICKNESS_MAP } from '../scene/wall';

export function runGeometryServiceTests() {
  suite('GeometryService (JSTS Integration)', () => {
    
    test('should be initialized without errors', () => {
        let service: GeometryService | null = null;
        service = new GeometryService();
        assert(service !== null, 'Service instance should be created');
    });

    test('should create a JSTS Polygon from a Wall and calculate its area', () => {
      const geometryService = new GeometryService();
      
      const wallLength = 100;
      const wallThickness = WALL_THICKNESS_MAP[WallType.EXTERIOR]; // Should be 20
      const wall = new Wall(1, {x: 0, y: 0}, {x: wallLength, y: 0}, WallType.EXTERIOR);
      
      const polygon = geometryService.createPolygonFromWall(wall);
      assert(polygon !== null, 'Polygon should be created');
      
      const expectedArea = wallLength * wallThickness;
      assertAlmostEqual(polygon.getArea(), expectedArea, 'Polygon area should be correct');
      assertEqual(polygon.getCoordinates().length, 5, 'Polygon should have 5 coordinates (4 corners + closing point)');
    });

  });
}