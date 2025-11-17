/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export class TextStyle {
    name: string;
    fontFamily: string;
    widthFactor: number;
    obliqueAngle: number; // in degrees

    constructor(name: string, fontFamily: string = 'Arial, sans-serif', widthFactor: number = 1.0, obliqueAngle: number = 0) {
        this.name = name;
        this.fontFamily = fontFamily;
        this.widthFactor = widthFactor;
        this.obliqueAngle = obliqueAngle;
    }

    toJSON() {
        return {
            name: this.name,
            fontFamily: this.fontFamily,
            widthFactor: this.widthFactor,
            obliqueAngle: this.obliqueAngle,
        };
    }

    static fromJSON(data: any): TextStyle {
        return new TextStyle(
            data.name,
            data.fontFamily,
            data.widthFactor,
            data.obliqueAngle
        );
    }
}