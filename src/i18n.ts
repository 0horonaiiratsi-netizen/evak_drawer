/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export class I18nService {
    private language: string = 'uk';
    private translations: Record<string, string> = {};

    async setLanguage(lang: string): Promise<void> {
        if (lang === this.language && Object.keys(this.translations).length > 0) {
            return;
        }
        this.language = lang;
        
        // In a web-only context, we'd use localStorage. For Electron, the main process is the source of truth.
        // We can still use localStorage as a cache for the browser version.
        try {
             localStorage.setItem('app-language', lang);
        } catch (e) {
            console.warn("Could not access localStorage. Language preference will not be saved in the browser.");
        }

        try {
            const response = await fetch(`./locales/${lang}.json`);
            if (!response.ok) {
                throw new Error(`Could not load language file: ${lang}.json`);
            }
            this.translations = await response.json();
            this.updateDOM();
            
            if (window.electronAPI?.languageChanged) {
                 window.electronAPI.languageChanged(lang);
            }
        } catch (error) {
            console.error(error);
            // Fallback to default language on error
            if (lang !== 'uk') {
                await this.setLanguage('uk');
            }
        }
    }

    async init(): Promise<void> {
        const savedLang = localStorage.getItem('app-language') || 'uk';
        await this.setLanguage(savedLang);
    }
    
    t(key: string, ...args: (string | number)[]): string {
        let translation = this.translations[key] || key;
        args.forEach((arg, index) => {
            translation = translation.replace(`{${index}}`, String(arg));
        });
        return translation;
    }

    updateDOM(): void {
        document.querySelectorAll<HTMLElement>('[data-i18n-key]').forEach(el => {
            const key = el.dataset.i18nKey!;
            // For buttons with only an icon, the text content might be inside a span
            const textSpan = el.querySelector('span');
            if (textSpan) {
                textSpan.textContent = this.t(key);
            } else {
                el.textContent = this.t(key);
            }
        });

        document.querySelectorAll<HTMLElement>('[data-i18n-tooltip]').forEach(el => {
            const key = el.dataset.i18nTooltip!;
            el.dataset.tooltip = this.t(key);
        });

        document.querySelectorAll<HTMLElement>('[data-i18n-aria-label]').forEach(el => {
            const key = el.dataset.i18nArialabel!;
            el.setAttribute('aria-label', this.t(key));
        });

        const titleEl = document.querySelector('title');
        if (titleEl) {
            titleEl.textContent = this.t('app.title');
        }
    }
}
