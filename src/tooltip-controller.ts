/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export class TooltipController {
    private tooltipElement: HTMLElement;
    private tooltipOffset = 15; // Offset from the cursor in pixels

    constructor() {
        this.tooltipElement = document.getElementById('tooltip')!;
        if (!this.tooltipElement) {
            console.error("Fatal Error: Tooltip element with ID 'tooltip' not found in the DOM.");
            return;
        }
        this.initListeners();
    }

    public initListeners(): void {
        const elementsWithTooltip = document.querySelectorAll<HTMLElement>('[data-tooltip]:not([data-tooltip-initialized])');
        elementsWithTooltip.forEach(el => {
            el.dataset.tooltipInitialized = 'true';
            el.addEventListener('mouseenter', this.handleMouseEnter);
            el.addEventListener('mousemove', this.handleMouseMove);
            el.addEventListener('mouseleave', this.handleMouseLeave);
        });
    }

    private handleMouseEnter = (event: MouseEvent): void => {
        const target = event.currentTarget as HTMLElement;
        const tooltipText = target.getAttribute('data-tooltip');
        if (tooltipText) {
            this.tooltipElement.textContent = tooltipText;
            this.tooltipElement.style.opacity = '1';
            this.tooltipElement.style.visibility = 'visible';
            // Position it immediately to avoid a flash at the old position
            this.handleMouseMove(event);
        }
    }
    
    private handleMouseMove = (event: MouseEvent): void => {
        // Position tooltip below and to the right of the cursor
        // This prevents the tooltip from flickering by being under the cursor itself
        this.tooltipElement.style.left = `${event.clientX + this.tooltipOffset}px`;
        this.tooltipElement.style.top = `${event.clientY + this.tooltipOffset}px`;
    }

    private handleMouseLeave = (): void => {
        this.tooltipElement.style.opacity = '0';
        // Use a transition listener or timeout to set visibility to hidden after the transition
        // For simplicity, we can also use a CSS transition delay.
        this.tooltipElement.style.visibility = 'hidden';
    }
}