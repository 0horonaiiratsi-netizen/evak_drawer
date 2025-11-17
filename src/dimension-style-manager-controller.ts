/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from './app';
import { ArrowType, DimensionStyle } from './styles/dimension-style';

export class DimensionStyleManagerController {
    private app: App;
    private styleList: HTMLSelectElement;
    private setCurrentButton: HTMLButtonElement;
    private newButton: HTMLButtonElement;
    private deleteButton: HTMLButtonElement;
    
    // Property Inputs
    private lineColorInput: HTMLInputElement;
    private extLineColorInput: HTMLInputElement;
    private extLineOffsetInput: HTMLInputElement;
    private extLineExtendInput: HTMLInputElement;
    private arrowTypeInput: HTMLSelectElement;
    private arrowSizeInput: HTMLInputElement;
    private textStyleInput: HTMLSelectElement;
    private textColorInput: HTMLInputElement;
    private textHeightInput: HTMLInputElement;
    private textOffsetInput: HTMLInputElement;
    private precisionInput: HTMLInputElement;


    constructor(app: App) {
        this.app = app;
        this.styleList = document.getElementById('dim-style-list') as HTMLSelectElement;
        this.setCurrentButton = document.getElementById('dim-style-set-current') as HTMLButtonElement;
        this.newButton = document.getElementById('dim-style-new') as HTMLButtonElement;
        this.deleteButton = document.getElementById('dim-style-delete') as HTMLButtonElement;

        // Lines
        this.lineColorInput = document.getElementById('dim-style-line-color') as HTMLInputElement;
        this.extLineColorInput = document.getElementById('dim-style-ext-line-color') as HTMLInputElement;
        this.extLineOffsetInput = document.getElementById('dim-style-ext-line-offset') as HTMLInputElement;
        this.extLineExtendInput = document.getElementById('dim-style-ext-line-extend') as HTMLInputElement;
        // Arrows
        this.arrowTypeInput = document.getElementById('dim-style-arrow-type') as HTMLSelectElement;
        this.arrowSizeInput = document.getElementById('dim-style-arrow-size') as HTMLInputElement;
        // Text
        this.textStyleInput = document.getElementById('dim-style-text-style') as HTMLSelectElement;
        this.textColorInput = document.getElementById('dim-style-text-color') as HTMLInputElement;
        this.textHeightInput = document.getElementById('dim-style-text-height') as HTMLInputElement;
        this.textOffsetInput = document.getElementById('dim-style-text-offset') as HTMLInputElement;
        // Units
        this.precisionInput = document.getElementById('dim-style-precision') as HTMLInputElement;
        
        this.initListeners();
        this.render();
    }

    private initListeners(): void {
        this.styleList.addEventListener('change', () => this.renderProperties());

        this.newButton.addEventListener('click', async () => {
            const finalName = await this.app.dialogController.prompt(
                this.app.i18n.t('dimStyleManager.dialog.new.title'),
                this.app.i18n.t('dimStyleManager.dialog.new.message'),
                ''
            );
            if (finalName && finalName.trim()) {
                const newStyle = new DimensionStyle(finalName.trim());
                this.app.styleManager.addDimensionStyle(newStyle);
                // FIX: Use projectStateService for history.
                this.app.projectStateService.commit(`Create dimension style "${newStyle.name}"`);
                this.render();
            }
        });

        this.deleteButton.addEventListener('click', () => {
            const selectedStyleName = this.styleList.value;
            if (selectedStyleName) {
                // TODO: Add check for in-use styles
                if (this.app.styleManager.deleteDimensionStyle(selectedStyleName)) {
                     // FIX: Use projectStateService for history.
                     this.app.projectStateService.commit(`Delete dimension style "${selectedStyleName}"`);
                     this.render();
                } else {
                    this.app.dialogController.alert(this.app.i18n.t('dialog.error'), this.app.i18n.t('styleManager.dialog.deleteReadonlyError'));
                }
            }
        });

        this.setCurrentButton.addEventListener('click', () => {
            const selectedStyleName = this.styleList.value;
            if (selectedStyleName) {
                this.app.styleManager.setCurrentDimensionStyle(selectedStyleName);
                this.render();
            }
        });
        
        const createUpdateListener = (
            input: HTMLInputElement | HTMLSelectElement,
            key: keyof Omit<DimensionStyle, 'name'>,
            parser: (val: string) => any,
            live: boolean = false
        ) => {
            const update = (commit: boolean) => {
                const selectedStyleName = this.getSelectedStyleName();
                if (!selectedStyleName) return;

                const value = parser(input.value);
                this.app.styleManager.updateDimensionStyle(selectedStyleName, { [key]: value });
                if (commit) {
                    // FIX: Use projectStateService for history.
                    this.app.projectStateService.commit(`Update dimstyle ${selectedStyleName}`);
                }
                // TODO: Redraw scene if needed
                this.app.draw();
            };

            const eventType = live ? 'input' : 'change';
            input.addEventListener(eventType, () => update(false));
            input.addEventListener('change', () => update(true)); // Always commit on final change
        };

        const asString = (v: string) => v;
        const asFloat = (v: string) => parseFloat(v);
        const asInt = (v: string) => parseInt(v, 10);
        const asIs = (v: any) => v;

        createUpdateListener(this.lineColorInput, 'lineColor', asString, true);
        createUpdateListener(this.extLineColorInput, 'extLineColor', asString, true);
        createUpdateListener(this.extLineOffsetInput, 'extLineOffset', asFloat);
        createUpdateListener(this.extLineExtendInput, 'extLineExtend', asFloat);
        createUpdateListener(this.arrowTypeInput, 'arrowType', asIs);
        createUpdateListener(this.arrowSizeInput, 'arrowSize', asFloat);
        createUpdateListener(this.textStyleInput, 'textStyleName', asString);
        createUpdateListener(this.textColorInput, 'textColor', asString, true);
        createUpdateListener(this.textHeightInput, 'textHeight', asFloat);
        createUpdateListener(this.textOffsetInput, 'textOffset', asFloat);
        createUpdateListener(this.precisionInput, 'unitPrecision', asInt);
    }

    private getSelectedStyleName(): string | null {
        return this.styleList.value;
    }

    public render(): void {
        const styles = this.app.styleManager.getAllDimensionStyles();
        const currentStyleName = this.app.styleManager.getCurrentDimensionStyleName();
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
        const style = selectedStyleName ? this.app.styleManager.getDimensionStyle(selectedStyleName) : null;
        
        const isReadonly = selectedStyleName ? this.app.styleManager.readonlyStyles.includes(selectedStyleName) : false;
        const isEnabled = !isReadonly && !!style;

        const inputs = [
            this.lineColorInput, this.extLineColorInput, this.extLineOffsetInput, this.extLineExtendInput,
            this.arrowTypeInput, this.arrowSizeInput, this.textStyleInput, this.textColorInput,
            this.textHeightInput, this.textOffsetInput, this.precisionInput
        ];
        
        inputs.forEach(input => input.disabled = !isEnabled);
        this.deleteButton.disabled = isReadonly || !selectedStyleName;
        
        if (style) {
            this.lineColorInput.value = style.lineColor;
            this.extLineColorInput.value = style.extLineColor;
            this.extLineOffsetInput.value = style.extLineOffset.toString();
            this.extLineExtendInput.value = style.extLineExtend.toString();
            this.arrowTypeInput.value = style.arrowType;
            this.arrowSizeInput.value = style.arrowSize.toString();
            this.textColorInput.value = style.textColor;
            this.textHeightInput.value = style.textHeight.toString();
            this.textOffsetInput.value = style.textOffset.toString();
            this.precisionInput.value = style.unitPrecision.toString();

            // Populate text styles dropdown
            this.textStyleInput.innerHTML = '';
            this.app.styleManager.getAllTextStyleNames().forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                this.textStyleInput.appendChild(option);
            });
            this.textStyleInput.value = style.textStyleName;
        } else {
            inputs.forEach(input => input.value = '');
        }
    }
}