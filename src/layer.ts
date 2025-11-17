/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export class Layer {
    id: number;
    name: string;
    color: string;
    linetype: string;
    isVisible: boolean;
    isLocked: boolean;
    objectIds: number[];

    constructor(id: number, name: string) {
        this.id = id;
        this.name = name;
        this.color = '#000000';
        this.linetype = 'CONTINUOUS';
        this.isVisible = true;
        this.isLocked = false;
        this.objectIds = [];
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            color: this.color,
            linetype: this.linetype,
            isVisible: this.isVisible,
            isLocked: this.isLocked,
            objectIds: this.objectIds
        };
    }

    static fromJSON(data: any): Layer {
        const layer = new Layer(data.id, data.name);
        layer.color = data.color ?? '#000000';
        layer.linetype = data.linetype ?? 'CONTINUOUS';
        layer.isVisible = data.isVisible ?? true;
        layer.isLocked = data.isLocked ?? false;
        layer.objectIds = data.objectIds ?? [];
        return layer;
    }
}
