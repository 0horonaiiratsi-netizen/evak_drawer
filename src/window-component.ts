/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { WindowManager } from './window-manager';

export class WindowComponent {
    private element: HTMLElement;
    private titleBar: HTMLElement;
    private closeButton: HTMLElement;
    private manager: WindowManager;
    private isDragging = false;
    private dragOffsetX = 0;
    private dragOffsetY = 0;
    private isResizing = false;
    private resizeDirection: string | null = null;
    private resizeStartX = 0;
    private resizeStartY = 0;
    private resizeStartWidth = 0;
    private resizeStartHeight = 0;
    private resizeHandleSize = 10;
    private isDocked = false;
    private dockPosition: 'left' | 'right' | 'top' | 'bottom' | null = null;
    private originalPosition: { left: number; top: number; width: number; height: number } | null = null;
    public id: string;

    constructor(element: HTMLElement, manager: WindowManager) {
        this.element = element;
        this.manager = manager;
        this.id = element.id;

        const titleBar = this.element.querySelector<HTMLElement>('.window-title-bar');
        const closeButton = this.element.querySelector<HTMLElement>('.close-button');

        if (!titleBar || !closeButton) {
            throw new Error(`Window component with ID "${this.id}" is missing required elements.`);
        }
        this.titleBar = titleBar;
        this.closeButton = closeButton;

        this.initListeners();
    }

    private initListeners(): void {
        // --- Dragging ---
        this.titleBar.addEventListener('mousedown', this.onDragStart);

        // --- Resizing ---
        this.element.addEventListener('mousemove', this.onMouseMove);
        this.element.addEventListener('mousedown', this.onResizeStart);

        // --- Activation ---
        this.element.addEventListener('mousedown', () => {
            this.manager.setActiveWindow(this);
        }, true); // Use capture phase to ensure this runs before other mousedown events

        // --- Controls ---
        this.closeButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent drag from starting
            this.hide();
        });
    }
    
    private onDragStart = (e: MouseEvent): void => {
        // Only drag with the primary mouse button
        if (e.button !== 0) return;

        this.isDragging = true;
        this.manager.setActiveWindow(this);
        
        const rect = this.element.getBoundingClientRect();
        this.dragOffsetX = e.clientX - rect.left;
        this.dragOffsetY = e.clientY - rect.top;

        // Prevent text selection while dragging
        e.preventDefault();

        // Add listeners to the window to handle movement and release
        window.addEventListener('mousemove', this.onDragMove);
        window.addEventListener('mouseup', this.onDragEnd);
    }
    
    private onDragMove = (e: MouseEvent): void => {
        if (!this.isDragging) return;

        let newLeft = e.clientX - this.dragOffsetX;
        let newTop = e.clientY - this.dragOffsetY;

        // Snapping to screen edges (20px threshold)
        const snapThreshold = 20;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const windowWidth = this.element.offsetWidth;
        const windowHeight = this.element.offsetHeight;

        let shouldDock = false;
        let dockPos: 'left' | 'right' | 'top' | 'bottom' | null = null;

        if (newLeft < snapThreshold) {
            shouldDock = true;
            dockPos = 'left';
            newLeft = 0;
        } else if (newLeft + windowWidth > viewportWidth - snapThreshold) {
            shouldDock = true;
            dockPos = 'right';
            newLeft = viewportWidth - windowWidth;
        }

        if (newTop < snapThreshold) {
            shouldDock = true;
            dockPos = 'top';
            newTop = 0;
        } else if (newTop + windowHeight > viewportHeight - snapThreshold) {
            shouldDock = true;
            dockPos = 'bottom';
            newTop = viewportHeight - windowHeight;
        }

        // If docking, save original position and dock
        if (shouldDock && !this.isDocked) {
            this.originalPosition = {
                left: parseFloat(this.element.style.left || '0'),
                top: parseFloat(this.element.style.top || '0'),
                width: this.element.offsetWidth,
                height: this.element.offsetHeight
            };
            this.isDocked = true;
            this.dockPosition = dockPos;
            this.element.classList.add('docked');
        } else if (!shouldDock && this.isDocked) {
            // Undock if moved away from edge
            this.isDocked = false;
            this.dockPosition = null;
            this.element.classList.remove('docked');
        }

        // Smooth update using requestAnimationFrame
        requestAnimationFrame(() => {
            this.element.style.left = `${newLeft}px`;
            this.element.style.top = `${newTop}px`;
        });
    }
    
    private onDragEnd = (): void => {
        this.isDragging = false;

        // Clean up the global event listeners
        window.removeEventListener('mousemove', this.onDragMove);
        window.removeEventListener('mouseup', this.onDragEnd);
    }

    private onMouseMove = (e: MouseEvent): void => {
        if (this.isDragging || this.isResizing) return;

        const rect = this.element.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const width = rect.width;
        const height = rect.height;

        let direction: string | null = null;

        if (x < this.resizeHandleSize && y < this.resizeHandleSize) {
            direction = 'nw';
        } else if (x > width - this.resizeHandleSize && y < this.resizeHandleSize) {
            direction = 'ne';
        } else if (x < this.resizeHandleSize && y > height - this.resizeHandleSize) {
            direction = 'sw';
        } else if (x > width - this.resizeHandleSize && y > height - this.resizeHandleSize) {
            direction = 'se';
        } else if (x < this.resizeHandleSize) {
            direction = 'w';
        } else if (x > width - this.resizeHandleSize) {
            direction = 'e';
        } else if (y < this.resizeHandleSize) {
            direction = 'n';
        } else if (y > height - this.resizeHandleSize) {
            direction = 's';
        }

        this.element.style.cursor = direction ? `${direction}-resize` : 'default';
    }

    private onResizeStart = (e: MouseEvent): void => {
        if (this.isDragging) return;

        const rect = this.element.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const width = rect.width;
        const height = rect.height;

        let direction: string | null = null;

        if (x < this.resizeHandleSize && y < this.resizeHandleSize) {
            direction = 'nw';
        } else if (x > width - this.resizeHandleSize && y < this.resizeHandleSize) {
            direction = 'ne';
        } else if (x < this.resizeHandleSize && y > height - this.resizeHandleSize) {
            direction = 'sw';
        } else if (x > width - this.resizeHandleSize && y > height - this.resizeHandleSize) {
            direction = 'se';
        } else if (x < this.resizeHandleSize) {
            direction = 'w';
        } else if (x > width - this.resizeHandleSize) {
            direction = 'e';
        } else if (y < this.resizeHandleSize) {
            direction = 'n';
        } else if (y > height - this.resizeHandleSize) {
            direction = 's';
        }

        if (direction) {
            e.preventDefault();
            this.isResizing = true;
            this.resizeDirection = direction;
            this.resizeStartX = e.clientX;
            this.resizeStartY = e.clientY;
            this.resizeStartWidth = width;
            this.resizeStartHeight = height;

            window.addEventListener('mousemove', this.onResizeMove);
            window.addEventListener('mouseup', this.onResizeEnd);
        }
    }

    private onResizeMove = (e: MouseEvent): void => {
        if (!this.isResizing) return;

        const deltaX = e.clientX - this.resizeStartX;
        const deltaY = e.clientY - this.resizeStartY;

        let newWidth = this.resizeStartWidth;
        let newHeight = this.resizeStartHeight;
        let newLeft = parseFloat(this.element.style.left || '0');
        let newTop = parseFloat(this.element.style.top || '0');

        switch (this.resizeDirection) {
            case 'e':
                newWidth = this.resizeStartWidth + deltaX;
                break;
            case 'w':
                newWidth = this.resizeStartWidth - deltaX;
                newLeft = this.resizeStartX + deltaX - (this.element.offsetWidth - this.resizeStartWidth);
                break;
            case 's':
                newHeight = this.resizeStartHeight + deltaY;
                break;
            case 'n':
                newHeight = this.resizeStartHeight - deltaY;
                newTop = this.resizeStartY + deltaY - (this.element.offsetHeight - this.resizeStartHeight);
                break;
            case 'se':
                newWidth = this.resizeStartWidth + deltaX;
                newHeight = this.resizeStartHeight + deltaY;
                break;
            case 'sw':
                newWidth = this.resizeStartWidth - deltaX;
                newHeight = this.resizeStartHeight + deltaY;
                newLeft = this.resizeStartX + deltaX - (this.element.offsetWidth - this.resizeStartWidth);
                break;
            case 'ne':
                newWidth = this.resizeStartWidth + deltaX;
                newHeight = this.resizeStartHeight - deltaY;
                newTop = this.resizeStartY + deltaY - (this.element.offsetHeight - this.resizeStartHeight);
                break;
            case 'nw':
                newWidth = this.resizeStartWidth - deltaX;
                newHeight = this.resizeStartHeight - deltaY;
                newLeft = this.resizeStartX + deltaX - (this.element.offsetWidth - this.resizeStartWidth);
                newTop = this.resizeStartY + deltaY - (this.element.offsetHeight - this.resizeStartHeight);
                break;
        }

        // Minimum size constraints
        newWidth = Math.max(newWidth, 200);
        newHeight = Math.max(newHeight, 100);

        requestAnimationFrame(() => {
            this.element.style.width = `${newWidth}px`;
            this.element.style.height = `${newHeight}px`;
            this.element.style.left = `${newLeft}px`;
            this.element.style.top = `${newTop}px`;
        });
    }

    private onResizeEnd = (): void => {
        this.isResizing = false;
        this.resizeDirection = null;

        window.removeEventListener('mousemove', this.onResizeMove);
        window.removeEventListener('mouseup', this.onResizeEnd);
    }

    public show(): void {
        this.element.classList.remove('hidden');
        this.manager.setActiveWindow(this);
        this.element.dispatchEvent(new CustomEvent('window-shown', {
            bubbles: true,
            detail: { windowId: this.id }
        }));
        // Sync with native menu
        if (window.electronAPI?.updateMenuState) {
            const menuId = `toggle-${this.id.replace('-window', '')}`; // e.g., 'toggle-layers'
            window.electronAPI.updateMenuState(menuId, true);
        }
    }

    public hide(): void {
        this.element.classList.add('hidden');
        this.element.dispatchEvent(new CustomEvent('window-hidden', {
            bubbles: true,
            detail: { windowId: this.id }
        }));
        // Sync with native menu
        if (window.electronAPI?.updateMenuState) {
            const menuId = `toggle-${this.id.replace('-window', '')}`; // e.g., 'toggle-layers'
            window.electronAPI.updateMenuState(menuId, false);
        }
    }

    public setActive(isActive: boolean): void {
        if (isActive) {
            this.element.classList.add('active');
            this.element.style.zIndex = this.manager.getTopZIndex().toString();
        } else {
            this.element.classList.remove('active');
        }
    }

    public isDockedWindow(): boolean {
        return this.isDocked;
    }

    public getDockPosition(): 'left' | 'right' | 'top' | 'bottom' | null {
        return this.dockPosition;
    }

    public undock(): void {
        if (this.isDocked && this.originalPosition) {
            this.isDocked = false;
            this.dockPosition = null;
            this.element.classList.remove('docked');
            this.element.style.left = `${this.originalPosition.left}px`;
            this.element.style.top = `${this.originalPosition.top}px`;
            this.element.style.width = `${this.originalPosition.width}px`;
            this.element.style.height = `${this.originalPosition.height}px`;
            this.originalPosition = null;
        }
    }
}
