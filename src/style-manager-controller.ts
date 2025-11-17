/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from './app';
import { TextStyle } from './styles/text-style';

export class StyleManagerController {
    private app: App;
    private styleList: HTMLSelectElement;
    private setCurrentButton: HTMLButtonElement;
    private newButton: HTMLButtonElement;
    private deleteButton: HTMLButtonElement;
    private fontFamilyInput: HTMLInputElement;
    private widthFactorInput: HTMLInputElement;
    private obliqueAngleInput: HTMLInputElement;

    constructor(app: App) {
        this.app = app;
        this.styleList = document.getElementById('style-list') as HTMLSelectElement;
        this.setCurrentButton = document.getElementById('style-set-current') as HTMLButtonElement;
        this.newButton = document.getElementById('style-new') as HTMLButtonElement;
        this.deleteButton = document.getElementById('style-delete') as HTMLButtonElement;
        this.fontFamilyInput = document.getElementById('style-font-family') as HTMLInputElement;
        this.widthFactorInput = document.getElementById('style-width-factor') as HTMLInputElement;
        this.obliqueAngleInput = document.getElementById('style-oblique-angle') as HTMLInputElement;
        
        this.initListeners();
        this.render();
    }

    private initListeners(): void {
        this.styleList.addEventListener('change', () => this.renderProperties());
        // FIX: Call method on App instance.
        this.newButton.addEventListener('click', () => this.app.promptForNewTextStyle());
        this.deleteButton.addEventListener('click', () => {
            const selectedStyleName = this.styleList.value;
            if (selectedStyleName) {
                // FIX: Call method on App instance.
                this.app.deleteTextStyle(selectedStyleName);
            }
        });
        this.setCurrentButton.addEventListener('click', () => {
            const selectedStyleName = this.styleList.value;
            if (selectedStyleName) {
                this.app.styleManager.setCurrentTextStyle(selectedStyleName);
                this.render(); // Re-render to show current style indicator
            }
        });
        
        const createUpdateListener = (input: HTMLInputElement, key: keyof Omit<TextStyle, 'name'>, parser: (val: string) => any) => {
            input.addEventListener('change', () => {
                const selectedStyleName = this.styleList.value;
                if (!selectedStyleName) return;

                const value = parser(input.value);
                this.app.styleManager.updateTextStyle(selectedStyleName, { [key]: value });
                // FIX: Use projectStateService for history.
                this.app.projectStateService.commit(`Update style ${selectedStyleName}`);
                this.app.draw(); // Redraw scene in case any text object uses this style
            });
        };

        createUpdateListener(this.fontFamilyInput, 'fontFamily', val => val.trim());
        createUpdateListener(this.widthFactorInput, 'widthFactor', val => parseFloat(val));
        createUpdateListener(this.obliqueAngleInput, 'obliqueAngle', val => parseFloat(val));
    }

    private getSelectedStyleName(): string | null {
        return this.styleList.value;
    }

    public render(): void {
        const styles = this.app.styleManager.getAllTextStyles();
        const currentStyleName = this.app.styleManager.getCurrentTextStyleName();
        const selectedValue = this.getSelectedStyleName() || currentStyleName;

        this.styleList.innerHTML = '';
        styles.forEach(style => {
            const option = document.createElement('option');
            option.value = style.name;
            option.textContent = `${style.name}${style.name === currentStyleName ? ' (current)' : ''}`;
            this.styleList.appendChild(option);
        });
        
        this.styleList.value = selectedValue;
        this.renderProperties();
    }

    private renderProperties(): void {
        const selectedStyleName = this.getSelectedStyleName();
        const style = selectedStyleName ? this.app.styleManager.getTextStyle(selectedStyleName) : null;
        
        const isReadonly = selectedStyleName ? this.app.styleManager.readonlyStyles.includes(selectedStyleName) : false;
        
        this.deleteButton.disabled = isReadonly || !selectedStyleName;
        this.fontFamilyInput.disabled = isReadonly;
        this.widthFactorInput.disabled = isReadonly;
        this.obliqueAngleInput.disabled = isReadonly;
        
        if (style) {
            this.fontFamilyInput.value = style.fontFamily;
            this.widthFactorInput.value = style.widthFactor.toString();
            this.obliqueAngleInput.value = style.obliqueAngle.toString();
        } else {
            this.fontFamilyInput.value = '';
            this.widthFactorInput.value = '';
            this.obliqueAngleInput.value = '';
        }
    }
}