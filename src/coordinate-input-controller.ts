/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from './app';

type CommitCallback = (value: number) => void;

export class CoordinateInputController {
    private app: App;
    private element: HTMLElement;
    private lengthInput: HTMLInputElement;
    private onCommit: CommitCallback | null = null;

    constructor(app: App) {
        this.app = app;
        this.element = document.getElementById('coord-input')!;
        this.lengthInput = document.getElementById('coord-input-length') as HTMLInputElement;

        this.lengthInput.addEventListener('keydown', this.handleKeyDown.bind(this));
        // Prevent clicks inside the input from propagating to the canvas
        this.element.addEventListener('mousedown', (e) => e.stopPropagation());
    }

    private handleKeyDown(e: KeyboardEvent): void {
        if (e.key === 'Enter') {
            const value = parseFloat(this.lengthInput.value);
            if (!isNaN(value) && this.onCommit) {
                this.onCommit(value);
            }
            e.preventDefault();
        } else if (e.key === 'Escape') {
            this.hide();
            e.preventDefault();
        }
    }

    public show(x: number, y: number, onCommit: CommitCallback): void {
        this.element.classList.remove('hidden');
        this.updatePosition(x, y);
        this.onCommit = onCommit;
        
        // Use a microtask to focus, ensuring the element is fully visible first
        setTimeout(() => {
            this.lengthInput.focus();
            this.lengthInput.select();
        }, 0);
    }

    public hide(): void {
        if (this.element.classList.contains('hidden')) return;

        this.element.classList.add('hidden');
        this.onCommit = null;
        // Return focus to the canvas so keyboard shortcuts for tools work again
        this.app.canvasController.canvasElement.focus();
    }

    public updatePosition(x: number, y: number): void {
        // Position it near the cursor, ensuring it doesn't go off-screen
        const elementRect = this.element.getBoundingClientRect();
        const padding = 20;
        let left = x + padding;
        let top = y + padding;

        if (left + elementRect.width > window.innerWidth) {
            left = x - elementRect.width - padding;
        }
        if (top + elementRect.height > window.innerHeight) {
            top = y - elementRect.height - padding;
        }

        this.element.style.left = `${left}px`;
        this.element.style.top = `${top}px`;
    }

    public updateLength(length: number): void {
        // Only update if the input is not focused, to avoid interrupting user typing
        if (document.activeElement !== this.lengthInput) {
            this.lengthInput.value = length.toFixed(2);
        }
    }
}