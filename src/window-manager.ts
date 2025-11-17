/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { WindowComponent } from './window-component';

export class WindowManager {
    private windows = new Map<string, WindowComponent>();
    private activeWindow: WindowComponent | null = null;
    private baseZIndex = 100;
    private topZIndex: number;
    private dockedWindows = new Map<'left' | 'right' | 'top' | 'bottom', WindowComponent[]>();

    constructor() {
        this.topZIndex = this.baseZIndex;
        this.discoverWindows();
    }

    private discoverWindows(): void {
        const windowElements = document.querySelectorAll<HTMLElement>('.window-wrapper');
        windowElements.forEach(el => {
            const windowComponent = new WindowComponent(el, this);
            this.windows.set(el.id, windowComponent);
        });
        
        // Set an initial active window if any are visible
        const initiallyVisibleElement = Array.from(windowElements).find(el => !el.classList.contains('hidden'));
        if (initiallyVisibleElement) {
            const initiallyVisibleWindow = this.windows.get(initiallyVisibleElement.id);
            if (initiallyVisibleWindow) {
                this.setActiveWindow(initiallyVisibleWindow);
            }
        }
    }

    public showWindow(id: string): void {
        const window = this.windows.get(id);
        if (window) {
            window.show();
        }
    }

    public hideWindow(id: string): void {
        const window = this.windows.get(id);
        if (window) {
            window.hide();
        }
    }

    public toggleWindow(id: string): void {
        const window = this.windows.get(id);
        if (window) {
            const element = (window as any).element as HTMLElement; // Access private element for check
            if (element.classList.contains('hidden')) {
                window.show();
            } else {
                window.hide();
            }
        }
    }

    public setActiveWindow(windowToActivate: WindowComponent): void {
        if (this.activeWindow === windowToActivate) {
            return; // It's already the active window
        }

        // Deactivate the currently active window
        if (this.activeWindow) {
            this.activeWindow.setActive(false);
        }

        // Activate the new window
        this.activeWindow = windowToActivate;
        this.topZIndex += 1; // Increment z-index for the new top window
        this.activeWindow.setActive(true);

        // Handle docking logic
        if (windowToActivate.isDockedWindow()) {
            const dockPos = windowToActivate.getDockPosition();
            if (dockPos) {
                // Add to docked windows if not already there
                if (!this.dockedWindows.has(dockPos)) {
                    this.dockedWindows.set(dockPos, []);
                }
                const dockedList = this.dockedWindows.get(dockPos)!;
                if (!dockedList.includes(windowToActivate)) {
                    dockedList.push(windowToActivate);
                }
            }
        } else {
            // Remove from docked if undocked
            for (const [pos, windows] of this.dockedWindows) {
                const index = windows.indexOf(windowToActivate);
                if (index > -1) {
                    windows.splice(index, 1);
                    if (windows.length === 0) {
                        this.dockedWindows.delete(pos);
                    }
                    break;
                }
            }
        }
    }
    
    public getTopZIndex(): number {
        return this.topZIndex;
    }

    public getDockedWindows(position: 'left' | 'right' | 'top' | 'bottom'): WindowComponent[] {
        return this.dockedWindows.get(position) || [];
    }

    public undockWindow(window: WindowComponent): void {
        window.undock();
        // Remove from docked list
        for (const [pos, windows] of this.dockedWindows) {
            const index = windows.indexOf(window);
            if (index > -1) {
                windows.splice(index, 1);
                if (windows.length === 0) {
                    this.dockedWindows.delete(pos);
                }
                break;
            }
        }
    }
}
