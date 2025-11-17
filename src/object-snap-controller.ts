/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "./app";
import { SnapType } from "./snapping";

export class ObjectSnapController {
    private app: App;
    private buttons: HTMLButtonElement[];
    private typeMapping: Map<string, SnapType>;

    constructor(app: App) {
        this.app = app;
        const toolbar = document.getElementById('object-snap-toolbar')!;
        this.buttons = Array.from(toolbar.querySelectorAll('.tool-button'));
        
        this.typeMapping = new Map([
            ['ENDPOINT', SnapType.ENDPOINT],
            ['MIDPOINT', SnapType.MIDPOINT],
            ['CENTER', SnapType.CENTER],
            ['INTERSECTION', SnapType.INTERSECTION],
            ['PERPENDICULAR', SnapType.PERPENDICULAR],
            ['QUADRANT', SnapType.QUADRANT],
            ['TANGENT', SnapType.TANGENT],
            ['NEAREST', SnapType.NEAREST],
        ]);

        this.init();
    }

    private init(): void {
        this.buttons.forEach(button => {
            button.addEventListener('click', () => {
                const snapTypeStr = button.dataset.snapType;
                if (snapTypeStr) {
                    const snapType = this.typeMapping.get(snapTypeStr);
                    if (snapType !== undefined) {
                        const currentState = this.app.snapModes.get(snapType) ?? false;
                        this.app.snapModes.set(snapType, !currentState);
                        button.classList.toggle('active', !currentState);
                        button.setAttribute('aria-pressed', String(!currentState));
                    }
                }
            });
        });
    }

    public syncButtonsToState(): void {
        this.buttons.forEach(button => {
            const snapTypeStr = button.dataset.snapType;
            if (snapTypeStr) {
                const snapType = this.typeMapping.get(snapTypeStr);
                if (snapType !== undefined) {
                    const isActive = this.app.snapModes.get(snapType) ?? false;
                    button.classList.toggle('active', isActive);
                    button.setAttribute('aria-pressed', String(isActive));
                }
            }
        });
    }
}