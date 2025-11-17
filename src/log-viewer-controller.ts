/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "./app";
import { LogEntry, LogService } from "./services/logger";

export class LogViewerController {
    private app: App;
    private contentElement: HTMLElement;
    private unsubscribe: (() => void) | null = null;

    constructor(app: App) {
        this.app = app;
        this.contentElement = document.getElementById('log-viewer-content')!;
        
        this.init();
    }

    private init(): void {
        this.renderInitialHistory();
        this.unsubscribe = LogService.subscribe(this.handleNewLogEntry);
    }

    private renderInitialHistory(): void {
        this.contentElement.innerHTML = '';
        const history = LogService.getHistory();
        history.forEach(entry => this.appendEntry(entry));
    }

    private handleNewLogEntry = (entry: LogEntry): void => {
        this.appendEntry(entry);
    }

    private appendEntry(entry: LogEntry): void {
        const entryDiv = document.createElement('div');
        entryDiv.className = `log-entry ${entry.level}`;
        
        const time = entry.timestamp.toLocaleTimeString('en-GB', { hour12: false });
        
        let message = `<span class="log-time">${time}</span><span class="log-message">${entry.message}</span>`;
        if (entry.data) {
            let dataStr: string;
            if (entry.data instanceof Error) {
                dataStr = entry.data.stack || entry.data.message;
            } else {
                try {
                    dataStr = JSON.stringify(entry.data, null, 2);
                } catch {
                    dataStr = String(entry.data);
                }
            }
            message += `\n<span class="log-data">${dataStr}</span>`;
        }
        
        entryDiv.innerHTML = message;
        this.contentElement.appendChild(entryDiv);

        // Auto-scroll to the bottom
        this.contentElement.scrollTop = this.contentElement.scrollHeight;
    }

    public dispose(): void {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
    }
}