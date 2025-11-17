/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export enum ArrowType {
    ARROW = 'ARROW',
    TICK = 'TICK',
    DOT = 'DOT',
}

export class DimensionStyle {
    name: string;
    
    // Lines
    lineColor: string;
    lineWidth: number;
    extLineColor: string;
    extLineWidth: number;
    extLineOffset: number; // Offset from origin
    extLineExtend: number; // Extends beyond dim line

    // Symbols & Arrows
    arrowType: ArrowType;
    arrowSize: number;

    // Text
    textStyleName: string;
    textColor: string;
    textHeight: number;
    textOffset: number; // Gap between dim line and text

    // Units
    unitPrecision: number; // Number of decimal places

    constructor(name: string) {
        this.name = name;
        
        const defaultColor = getComputedStyle(document.documentElement).getPropertyValue('--wall-color').trim();

        this.lineColor = defaultColor;
        this.lineWidth = 1;
        this.extLineColor = defaultColor;
        this.extLineWidth = 1;
        this.extLineOffset = 5;
        this.extLineExtend = 5;

        this.arrowType = ArrowType.ARROW;
        this.arrowSize = 8;

        this.textStyleName = 'Standard';
        this.textColor = defaultColor;
        this.textHeight = 12;
        this.textOffset = 3;

        this.unitPrecision = 2;
    }

    toJSON() {
        return {
            name: this.name,
            lineColor: this.lineColor,
            lineWidth: this.lineWidth,
            extLineColor: this.extLineColor,
            extLineWidth: this.extLineWidth,
            extLineOffset: this.extLineOffset,
            extLineExtend: this.extLineExtend,
            arrowType: this.arrowType,
            arrowSize: this.arrowSize,
            textStyleName: this.textStyleName,
            textColor: this.textColor,
            textHeight: this.textHeight,
            textOffset: this.textOffset,
            unitPrecision: this.unitPrecision,
        };
    }

    static fromJSON(data: any): DimensionStyle {
        const style = new DimensionStyle(data.name);
        // This allows loading older files that might not have all properties
        Object.assign(style, data);
        return style;
    }
}