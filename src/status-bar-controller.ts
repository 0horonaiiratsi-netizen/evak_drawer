/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { Point } from './scene/point';

export class StatusBarController {
    private xCoordElement: HTMLElement;
    private yCoordElement: HTMLElement;

    constructor() {
        this.xCoordElement = document.getElementById('coord-x')!;
        this.yCoordElement = document.getElementById('coord-y')!;

        if (!this.xCoordElement || !this.yCoordElement) {
            console.error("Status bar coordinate elements not found!");
        }
    }

    public updateCoordinates(point: Point): void {
        if (this.xCoordElement && this.yCoordElement) {
            this.xCoordElement.textContent = point.x.toFixed(2);
            this.yCoordElement.textContent = point.y.toFixed(2);
        }
    }
}