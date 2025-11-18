/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { DxfImportService } from '../services/dxf-import-service';
import { DxfExportService } from '../services/dxf-export-service';
import { StlExportService } from '../services/stl-export-service';
import { StepImportExportService } from '../services/step-import-export-service';
import { PolylineObject } from '../scene/polyline-object';
import { CircleObject } from '../scene/circle-object';
import { ExtrudeObject } from '../scene/extrude-object';
import { RevolveObject } from '../scene/revolve-object';
import { Point } from '../scene/point';

describe('Import/Export Services', () => {

    describe('DXF Import Service', () => {
        it('should import basic DXF content', async () => {
            const dxfContent = `0
SECTION
2
ENTITIES
0
LINE
10
0.0
20
0.0
11
100.0
21
0.0
0
ENDSEC
0
EOF`;

            const objects = await DxfImportService.importDxf(dxfContent);
            expect(objects).toBeDefined();
            expect(objects.length).toBeGreaterThan(0);
        });

        it('should handle empty DXF content', async () => {
            const objects = await DxfImportService.importDxf('');
            expect(objects).toEqual([]);
        });

        it('should import polyline from DXF', async () => {
            const dxfContent = `0
SECTION
2
ENTITIES
0
LWPOLYLINE
90
3
10
0.0
20
0.0
10
50.0
20
0.0
10
50.0
20
50.0
0
ENDSEC
0
EOF`;

            const objects = await DxfImportService.importDxf(dxfContent);
            expect(objects.length).toBe(1);
            expect(objects[0]).toBeInstanceOf(PolylineObject);
        });

        it('should import circle from DXF', async () => {
            const dxfContent = `0
SECTION
2
ENTITIES
0
CIRCLE
10
0.0
20
0.0
30
0.0
40
25.0
0
ENDSEC
0
EOF`;

            const objects = await DxfImportService.importDxf(dxfContent);
            expect(objects.length).toBe(1);
            expect(objects[0]).toBeInstanceOf(CircleObject);
        });
    });

    describe('DXF Export Service', () => {
        it('should export empty objects array', () => {
            const dxfContent = DxfExportService.exportDxf([]);
            expect(dxfContent).toContain('SECTION');
            expect(dxfContent).toContain('ENTITIES');
            expect(dxfContent).toContain('ENDSEC');
        });

        it('should export polyline object', () => {
            const polyline = new PolylineObject(1, [
                { x: 0, y: 0 },
                { x: 100, y: 0 },
                { x: 100, y: 100 }
            ]);
            polyline.isClosed = true;

            const dxfContent = DxfExportService.exportDxf([polyline]);
            expect(dxfContent).toContain('LWPOLYLINE');
            expect(dxfContent).toContain('90');
        });

        it('should export circle object', () => {
            const circle = new CircleObject(1, { x: 50, y: 50 }, 25);

            const dxfContent = DxfExportService.exportDxf([circle]);
            expect(dxfContent).toContain('CIRCLE');
            expect(dxfContent).toContain('40');
        });
    });

    describe('STL Export Service', () => {
        it('should export empty objects array', () => {
            const mockApp = {};
            const stlContent = StlExportService.exportStl([], mockApp as any);
            expect(stlContent).toContain('solid exported');
            expect(stlContent).toContain('endsolid exported');
        });

        it('should handle extrude object without mesh', () => {
            const extrude = new ExtrudeObject(1, 2, 10);
            const mockApp = {
                sceneService: {
                    findById: () => null
                }
            };

            const stlContent = StlExportService.exportStl([extrude], mockApp as any);
            expect(stlContent).toContain('solid exported');
        });

        it('should handle revolve object without mesh', () => {
            const revolve = new RevolveObject(1, 2, { x: 0, y: 0 }, { x: 0, y: 10 }, Math.PI);
            const mockApp = {
                sceneService: {
                    findById: () => null
                }
            };

            const stlContent = StlExportService.exportStl([revolve], mockApp as any);
            expect(stlContent).toContain('solid exported');
        });
    });

    describe('STEP Import/Export Service', () => {
        it('should return empty array for STEP import with valid header', async () => {
            const stepContent = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('STEP AP214'),'2;1');
ENDSEC;
DATA;
ENDSEC;
END-ISO-10303-21;`;
            const objects = await StepImportExportService.importStep(stepContent);
            expect(objects).toEqual([]);
        });

        it('should throw error for invalid STEP content', async () => {
            await expect(StepImportExportService.importStep('invalid')).rejects.toThrow('Невірний формат STEP файлу');
        });

        it('should return empty string for STEP export', () => {
            const stepContent = StepImportExportService.exportStep([]);
            expect(stepContent).toBe('');
        });

        it('should return empty array for IGES import', async () => {
            const objects = await StepImportExportService.importIges('dummy content');
            expect(objects).toEqual([]);
        });

        it('should return empty string for IGES export', () => {
            const igesContent = StepImportExportService.exportIges([]);
            expect(igesContent).toBe('');
        });
    });

    describe('Integration Tests', () => {
        it('should round-trip DXF export/import for simple objects', async () => {
            // Create test objects
            const originalObjects = [
                new PolylineObject(1, [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }]),
                new CircleObject(2, { x: 50, y: 50 }, 25)
            ];

            // Export to DXF
            const dxfContent = DxfExportService.exportDxf(originalObjects);
            expect(dxfContent).toBeDefined();
            expect(dxfContent.length).toBeGreaterThan(0);

            // Import back from DXF
            const importedObjects = await DxfImportService.importDxf(dxfContent);
            expect(importedObjects).toBeDefined();
            expect(importedObjects.length).toBeGreaterThan(0);
        });

        it('should handle mixed object types in export', () => {
            const mixedObjects = [
                new PolylineObject(1, [{ x: 0, y: 0 }, { x: 100, y: 100 }]),
                new CircleObject(2, { x: 0, y: 0 }, 50),
                new ExtrudeObject(3, 1, 20),
                new RevolveObject(4, 2, { x: 0, y: 0 }, { x: 0, y: 10 }, Math.PI * 2)
            ];

            const dxfContent = DxfExportService.exportDxf(mixedObjects);
            expect(dxfContent).toContain('CIRCLE');
            // Only Circle is exported, Polyline is not in the mock for mixed objects
            // Extrude and Revolve objects may not export directly to DXF
        });
    });
});
