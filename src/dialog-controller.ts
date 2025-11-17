/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { I18nService } from "./i18n";

export class DialogController {
    private i18n: I18nService;
    private backdrop: HTMLElement;
    private loadingDialog: HTMLElement;
    private loadingTitle: HTMLElement;
    private loadingContent: HTMLElement;
    private alertDialog: HTMLElement;
    private alertTitle: HTMLElement;
    private alertContent: HTMLElement;
    private alertOkButton: HTMLButtonElement;
    private resolveAlert: (() => void) | null = null;
    private promptDialog: HTMLElement;
    private promptTitle: HTMLElement;
    private promptMessage: HTMLElement;
    private promptInput: HTMLInputElement;
    private promptOkButton: HTMLButtonElement;
    private promptCancelButton: HTMLButtonElement;
    private resolvePrompt: ((value: string | null) => void) | null = null;

    constructor(i18n: I18nService) {
        this.i18n = i18n;
        this.backdrop = document.getElementById('modal-backdrop')!;
        this.loadingDialog = document.getElementById('loading-dialog')!;
        this.loadingTitle = document.getElementById('loading-dialog-title')!;
        this.loadingContent = document.getElementById('loading-dialog-content')!;
        this.alertDialog = document.getElementById('alert-dialog')!;
        this.alertTitle = document.getElementById('alert-dialog-title')!;
        this.alertContent = document.getElementById('alert-dialog-content')!;
        this.alertOkButton = document.getElementById('alert-dialog-ok') as HTMLButtonElement;
        this.promptDialog = document.getElementById('prompt-dialog')!;
        this.promptTitle = document.getElementById('prompt-dialog-title')!;
        this.promptMessage = document.getElementById('prompt-dialog-message')!;
        this.promptInput = document.getElementById('prompt-dialog-input') as HTMLInputElement;
        this.promptOkButton = document.getElementById('prompt-dialog-ok') as HTMLButtonElement;
        this.promptCancelButton = document.getElementById('prompt-dialog-cancel') as HTMLButtonElement;
        this.initListeners();
    }

    private initListeners(): void {
        this.alertOkButton.addEventListener('click', () => {
            if (this.resolveAlert) {
                this.resolveAlert();
            }
            this.hideAll();
        });

        if (this.promptOkButton) {
            this.promptOkButton.addEventListener('click', () => {
                if (this.resolvePrompt) {
                    this.resolvePrompt(this.promptInput.value);
                }
                this.hideAll();
            });
        }

        if (this.promptCancelButton) {
            this.promptCancelButton.addEventListener('click', () => {
                if (this.resolvePrompt) {
                    this.resolvePrompt(null);
                }
                this.hideAll();
            });
        }
        
        if (this.promptInput) {
            this.promptInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.promptOkButton.click();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    this.promptCancelButton.click();
                }
            });
        }

        this.backdrop.addEventListener('click', (e) => {
            if (!this.loadingDialog.classList.contains('hidden')) {
                return;
            }
            if (this.resolveAlert) {
                this.resolveAlert();
            }
            if (this.resolvePrompt) {
                this.resolvePrompt(null);
            }
            this.hideAll();
        });
    }

    private showBackdrop(): void {
        this.backdrop.classList.remove('hidden');
    }

    private hideAll(): void {
        this.backdrop.classList.add('hidden');
        this.alertDialog.classList.add('hidden');
        if (this.promptDialog) this.promptDialog.classList.add('hidden');
        this.loadingDialog.classList.add('hidden');
        this.resolveAlert = null;
        this.resolvePrompt = null;
    }

    public showLoading(title: string, message: string): void {
        this.showBackdrop();
        this.loadingTitle.textContent = title;
        this.loadingContent.textContent = message;
        this.loadingDialog.classList.remove('hidden');
    }

    public hideLoading(): void {
        this.hideAll();
    }

    public async alert(title: string, message: string): Promise<void> {
        if (window.electronAPI?.showAlert) {
            await window.electronAPI.showAlert({ title, message });
            return;
        }

        return new Promise(resolve => {
            this.showBackdrop();
            this.alertTitle.textContent = title;
            this.alertContent.innerHTML = message.replace(/\n/g, '<br>');
            this.alertOkButton.textContent = this.i18n.t('modals.buttons.ok');
            this.alertDialog.classList.remove('hidden');
            this.alertOkButton.focus();
            this.resolveAlert = resolve;
        });
    }

    public prompt(title: string, message: string, defaultValue: string = ''): Promise<string | null> {
        if (window.electronAPI?.showPrompt) {
            return window.electronAPI.showPrompt({ title, message, defaultValue }).then(result => {
                return result.canceled ? null : result.value;
            });
        }

        return new Promise(resolve => {
            if (!this.promptDialog || !this.promptInput) {
                // Fallback if the prompt dialog was removed from HTML
                console.warn("HTML prompt dialog not found.");
                resolve(window.prompt(message, defaultValue));
                return;
            }
            this.showBackdrop();
            this.promptTitle.textContent = title;
            this.promptMessage.textContent = message;
            this.promptInput.value = defaultValue;
            this.promptOkButton.textContent = this.i18n.t('modals.buttons.ok');
            this.promptCancelButton.textContent = this.i18n.t('modals.buttons.cancel');
            this.promptDialog.classList.remove('hidden');
            this.promptInput.focus();
            this.promptInput.select();
            this.resolvePrompt = resolve;
        });
    }

    public notify(title: string, body: string): void {
        if (window.electronAPI?.showNotification) {
            window.electronAPI.showNotification({ title, body });
        } else {
            console.log(`[Notification] ${title}: ${body}`);
        }
    }
}