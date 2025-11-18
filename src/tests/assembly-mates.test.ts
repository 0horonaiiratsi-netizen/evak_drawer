/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { describe, it, expect } from 'vitest';
import { AssemblyObject, Mate } from '../scene/assembly-object';
import { MateService } from '../services/mate-service';
import { ExtrudeObject } from '../scene/extrude-object';
import { Point } from '../scene/point';

describe('AssemblyObject and MateService', () => {
    it('should create an assembly with components', () => {
        const component1 = new ExtrudeObject(1, 10, 10);
        const component2 = new ExtrudeObject(2, 11, 10);
        const assembly = new AssemblyObject(3, [component1, component2]);

        expect(assembly.components.length).toBe(2);
        expect(assembly.id).toBe(3);
    });

    it('should add and remove components', () => {
        const assembly = new AssemblyObject(1, []);
        const component = new ExtrudeObject(2, 10, 10);

        assembly.addComponent(component);
        expect(assembly.components.length).toBe(1);

        assembly.removeComponent(2);
        expect(assembly.components.length).toBe(0);
    });

    it('should manage mates', () => {
        const mateService = new MateService();
        const mate: Mate = {
            id: 1,
            type: 'rigid',
            componentA: 1,
            componentB: 2,
            originA: { x: 0, y: 0 },
            originB: { x: 10, y: 0 },
            constraints: {}
        };

        mateService.addMate(mate);
        expect(mateService.getMates().length).toBe(1);

        mateService.removeMate(1);
        expect(mateService.getMates().length).toBe(0);
    });

    it('should validate mates', () => {
        const mateService = new MateService();
        const validMate: Mate = {
            id: 1,
            type: 'rigid',
            componentA: 1,
            componentB: 2,
            originA: { x: 0, y: 0 },
            originB: { x: 10, y: 0 },
            constraints: {}
        };

        const invalidMate: Mate = {
            id: 2,
            type: 'invalid' as any,
            componentA: 1,
            componentB: 2,
            originA: { x: 0, y: 0 },
            originB: { x: 10, y: 0 },
            constraints: {}
        };

        expect(mateService.validateMate(validMate)).toBe(true);
        expect(mateService.validateMate(invalidMate)).toBe(false);
    });
});
