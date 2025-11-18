/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { describe, it, expect, vi } from 'vitest';
import { BOMService, BOMItem } from '../services/bom-service';
import { AssemblyObject } from '../scene/assembly-object';
import { ExtrudeObject } from '../scene/extrude-object';

describe('BOMService', () => {
    it('should generate BOM from assembly', () => {
        const bomService = new BOMService();
        const mockAssembly = {
            components: [
                { id: 1, constructor: { name: 'ExtrudeObject' }, getBoundingBox: vi.fn().mockReturnValue({ minX: 0, minY: 0, maxX: 10, maxY: 10 }) },
                { id: 2, constructor: { name: 'ExtrudeObject' }, getBoundingBox: vi.fn().mockReturnValue({ minX: 10, minY: 10, maxX: 20, maxY: 20 }) }
            ],
            getBoundingBox: vi.fn().mockReturnValue({ minX: 0, minY: 0, maxX: 20, maxY: 20 })
        } as any;

        const bom = bomService.generateBOM(mockAssembly);

        expect(bom.length).toBe(1); // Only the assembly itself is processed in this mock
        expect(bom[0].type).toBe('Object'); // Mock assembly type
    });

    it('should export BOM to CSV', () => {
        const bomService = new BOMService();
        const mockBOM: BOMItem[] = [
            { id: 1, name: 'Test Component', type: 'ExtrudeObject', quantity: 1, material: 'Steel', dimensions: '10x10x10' }
        ];
        const csv = bomService.exportToCSV(mockBOM);

        expect(csv).toContain('"ID","Name","Type","Quantity","Material","Dimensions"');
        expect(csv).toContain('"1","Test Component","ExtrudeObject","1","Steel","10x10x10"');
    });

    it('should export BOM to HTML', () => {
        const bomService = new BOMService();
        const mockBOM: BOMItem[] = [
            { id: 1, name: 'Test Component', type: 'ExtrudeObject', quantity: 1, material: 'Steel', dimensions: '10x10x10' }
        ];
        const html = bomService.exportToHTML(mockBOM);

        expect(html).toContain('<table>');
        expect(html).toContain('Test Component');
        expect(html).toContain('ExtrudeObject');
    });
});
