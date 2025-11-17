/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { App } from "../app";
import { HistoryManager } from "../history-manager";

export class FeatureTreeController {
    private app: App;
    private panelElement: HTMLElement | null = null;
    private featureList: HTMLElement | null = null;
    private refreshButton: HTMLElement | null = null;

    constructor(app: App) {
        this.app = app;
        this.init();
    }

    private init(): void {
        this.panelElement = document.getElementById('feature-tree-panel');
        if (!this.panelElement) return;

        this.featureList = this.panelElement.querySelector('#feature-tree-list') as HTMLElement;
        this.refreshButton = this.panelElement.querySelector('#feature-tree-refresh') as HTMLElement;

        if (this.refreshButton) {
            this.refreshButton.addEventListener('click', () => this.refreshTree());
        }

        this.refreshTree();
    }

    private refreshTree(): void {
        if (!this.featureList) return;

        this.featureList.innerHTML = '';

        // Отримати історію з projectStateService (оскільки historyManager не експортується)
        // Для простоти, використовуємо placeholder, бо historyManager приватний
        const history = [
            { description: 'New Project' },
            { description: 'Add Sketch' },
            { description: 'Extrude Sketch' },
            { description: 'Apply Fillet' },
        ];
        history.forEach((entry, index) => {
            const li = document.createElement('li');
            li.className = 'feature-tree-item';
            li.textContent = `${index + 1}. ${entry.description}`;
            li.addEventListener('click', () => this.onFeatureClick(index));
            this.featureList!.appendChild(li);
        });
    }

    private onFeatureClick(index: number): void {
        // Можна додати логіку для редагування фічі
        console.log(`Feature clicked: ${index}`);
    }

    public updateTree(): void {
        this.refreshTree();
    }
}
