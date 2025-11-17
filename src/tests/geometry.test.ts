/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { suite, test, assertEqual, assertAlmostEqual, assert } from '../utils/test-runner';
import { distance, snapToGrid, snapToAngle, findClosestWall } from '../utils/geometry';
import { Wall } from '../scene/wall';
import { SceneObject } from '../scene/scene-object';

export function runGeometryTests() {
    suite('Geometry Utilities', () => {

        test('distance() calculates correct distances', () => {
            assertEqual(distance({x: 0, y: 0}, {x: 3, y: 4}), 5, 'Pythagorean triple');
            assertEqual(distance({x: 10, y: 10}, {x: 10, y: 10}), 0, 'Zero distance');
            assertAlmostEqual(distance({x: 1, y: 1}, {x: 2, y: 2}), Math.SQRT2, 'Diagonal distance');
        });

        test('snapToGrid() snaps to the nearest grid intersection', () => {
            // Assumes GRID_SIZE_MINOR is 20
            assertEqual(snapToGrid({x: 9, y: 21}), {x: 0, y: 20}, 'Snaps x down (9->0) and y down (21->20)');
            assertEqual(snapToGrid({x: 11, y: 19}), {x: 20, y: 20}, 'Snaps x up (11->20) and y up (19->20)');
            assertEqual(snapToGrid({x: 40, y: 60}), {x: 40, y: 60}, 'Already on grid');
            assertEqual(snapToGrid({x: -9, y: -21}), {x: 0, y: -20}, 'Handles negative coordinates (snaps toward zero)');
        });

        suite('findClosestWall()', () => {
            const wall1 = new Wall(1, {x: 0, y: 0}, {x: 100, y: 0}); // Horizontal
            const wall2 = new Wall(2, {x: 150, y: 50}, {x: 150, y: 150}); // Vertical
            const scene: SceneObject[] = [wall1, wall2];

            test('finds the correct wall when point is close', () => {
                const result = findClosestWall({x: 50, y: 5}, scene, 10);
                assert(result !== null, 'Should find a wall');
                assertEqual(result!.wall.id, wall1.id, 'Should find wall1');
                assertEqual(result!.closestPoint, {x: 50, y: 0}, 'Closest point should be on the wall');
            });

            test('returns null when no wall is within tolerance', () => {
                const result = findClosestWall({x: 50, y: 20}, scene, 10);
                assertEqual(result, null, 'Should not find a wall');
            });

            test('finds the closest endpoint of a wall', () => {
                const result = findClosestWall({x: -10, y: 5}, scene, 20);
                assert(result !== null, 'Should find a wall near endpoint');
                assertEqual(result!.wall.id, wall1.id, 'Should find wall1');
                assertEqual(result!.closestPoint, {x: 0, y: 0}, 'Closest point should be the start of the wall');
            });
            
            test('chooses the closer of two walls', () => {
                const result = findClosestWall({x: 120, y: 20}, scene, 30);
                assert(result !== null, 'Should find a wall');
                assertEqual(result!.wall.id, wall1.id, 'Wall1 is closer (dist 20) than wall2 (dist 30)');
            });

            test('handles vertical walls correctly', () => {
                const result = findClosestWall({x: 140, y: 100}, scene, 15);
                 assert(result !== null, 'Should find a wall');
                assertEqual(result!.wall.id, wall2.id, 'Should find vertical wall2');
                assertEqual(result!.closestPoint, {x: 150, y: 100}, 'Closest point should be on vertical wall');
            });

             test('returns null for an empty scene', () => {
                const result = findClosestWall({x: 50, y: 5}, [], 10);
                assertEqual(result, null, 'Should return null if scene has no walls');
            });
        });
    });
}