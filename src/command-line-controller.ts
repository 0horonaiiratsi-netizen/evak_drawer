/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "./app";
import { I18nService } from "./i18n";

export class CommandLineController {
    private app: App;
    private i18n: I18nService;
    private historyElement: HTMLElement;
    private promptElement: HTMLElement;
    private inputElement: HTMLInputElement;

    constructor(app: App) {
        this.app = app;
        this.i18n = app.i18n;
        this.historyElement = document.getElementById('command-history')!;
        this.promptElement = document.getElementById('command-prompt')!;
        this.inputElement = document.getElementById('command-input') as HTMLInputElement;

        this.initListeners();
        this.showDefaultPrompt();
    }

    private initListeners(): void {
        this.inputElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.handleInput();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.app.commandManager.cancelCommand();
            }
        });

        document.getElementById('command-line')!.addEventListener('click', (e) => {
            // Prevent clicks on the history from blurring the input
            if (e.target === this.historyElement) {
                e.preventDefault();
            }
            this.inputElement.focus();
        });
    }

    private handleInput(): void {
        const value = this.inputElement.value.trim();
        this.inputElement.value = '';

        if (this.app.commandManager.activeCommand) {
            // FIX: Use optional chaining as handleTextInput is now optional.
            this.app.commandManager.activeCommand.handleTextInput?.(value);
        } else {
            this.app.commandManager.startCommand(value);
        }
    }

    public setPrompt(message: string): void {
        this.historyElement.innerHTML = message; // Use innerHTML to allow for formatting
    }

    public showDefaultPrompt(): void {
        this.historyElement.textContent = this.i18n.t('commandLine.defaultPrompt');
    }

    public focus(): void {
        this.inputElement.focus();
    }

    public clearInput(): void {
        this.inputElement.value = '';
    }
}
