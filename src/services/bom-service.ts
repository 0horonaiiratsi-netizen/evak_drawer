/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { AssemblyObject } from "../scene/assembly-object";
import { SceneObject } from "../scene/scene-object";

export interface BOMItem {
    id: number;
    name: string;
    type: string;
    quantity: number;
    material?: string;
    dimensions?: string;
    properties?: any;
}

export class BOMService {
    generateBOM(assembly: AssemblyObject): BOMItem[] {
        const bomMap = new Map<string, BOMItem>();

        const traverse = (obj: SceneObject) => {
            const key = `${obj.constructor.name}_${obj.id}`;
            if (!bomMap.has(key)) {
                bomMap.set(key, {
                    id: obj.id,
                    name: this.getObjectName(obj),
                    type: obj.constructor.name,
                    quantity: 1,
                    properties: this.extractProperties(obj)
                });
            } else {
                bomMap.get(key)!.quantity++;
            }

            // If it's an assembly, traverse components
            if (obj instanceof AssemblyObject) {
                obj.components.forEach(traverse);
            }
        };

        traverse(assembly);

        return Array.from(bomMap.values());
    }

    private getObjectName(obj: SceneObject): string {
        // Placeholder: implement naming logic based on object type
        return `${obj.constructor.name} ${obj.id}`;
    }

    private extractProperties(obj: SceneObject): any {
        // Placeholder: extract relevant properties like dimensions, material
        const bbox = obj.getBoundingBox();
        return {
            width: bbox.maxX - bbox.minX,
            height: bbox.maxY - bbox.minY
        };
    }

    exportToCSV(bom: BOMItem[]): string {
        const headers = ['ID', 'Name', 'Type', 'Quantity', 'Material', 'Dimensions'];
        const rows = bom.map(item => [
            item.id,
            item.name,
            item.type,
            item.quantity,
            item.material || '',
            item.dimensions || ''
        ]);

        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');

        return csvContent;
    }

    exportToHTML(bom: BOMItem[]): string {
        let html = `
        <html>
        <head>
            <title>BOM - Bill of Materials</title>
            <style>
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
            </style>
        </head>
        <body>
            <h1>Bill of Materials</h1>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Quantity</th>
                        <th>Material</th>
                        <th>Dimensions</th>
                    </tr>
                </thead>
                <tbody>
        `;

        bom.forEach(item => {
            html += `
                <tr>
                    <td>${item.id}</td>
                    <td>${item.name}</td>
                    <td>${item.type}</td>
                    <td>${item.quantity}</td>
                    <td>${item.material || ''}</td>
                    <td>${item.dimensions || ''}</td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        </body>
        </html>
        `;

        return html;
    }
}
