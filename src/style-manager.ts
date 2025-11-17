/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { DimensionStyle } from './styles/dimension-style';
import { TextStyle } from './styles/text-style';

export class StyleManager {
    private textStyles: Map<string, TextStyle> = new Map();
    private dimensionStyles: Map<string, DimensionStyle> = new Map();
    private currentTextStyleName: string = 'Standard';
    private currentDimensionStyleName: string = 'Standard';
    public readonly readonlyStyles: string[] = ['Standard', 'D-431', 'Bm-431', 'R-151'];

    constructor() {
        this.createDefaultStyles();
    }

    private createDefaultStyles(): void {
        const standardStyle = new TextStyle('Standard', 'Arial, sans-serif');
        this.textStyles.set(standardStyle.name, standardStyle);
        
        // Add topographic fonts
        const d431 = new TextStyle('D-431', '"GOST type A", "D-431", Arial, sans-serif');
        this.textStyles.set(d431.name, d431);

        const bm431 = new TextStyle('Bm-431', '"GOST type B", "Bm-431", Arial, sans-serif');
        this.textStyles.set(bm431.name, bm431);

        const r151 = new TextStyle('R-151', '"R-151", Arial, sans-serif');
        this.textStyles.set(r151.name, r151);
        
        const standardDimStyle = new DimensionStyle('Standard');
        this.dimensionStyles.set(standardDimStyle.name, standardDimStyle);
    }

    public getTextStyle(name: string): TextStyle | undefined {
        return this.textStyles.get(name);
    }

    public getCurrentTextStyleName(): string {
        return this.currentTextStyleName;
    }
    
    public addTextStyle(style: TextStyle): void {
        if (!this.textStyles.has(style.name)) {
            this.textStyles.set(style.name, style);
        }
    }

    public deleteTextStyle(name: string): boolean {
        if (this.readonlyStyles.includes(name) || !this.textStyles.has(name)) {
            return false;
        }

        this.textStyles.delete(name);
        if (this.currentTextStyleName === name) {
            this.currentTextStyleName = 'Standard';
        }
        return true;
    }

    public updateTextStyle(name: string, newProps: Partial<Omit<TextStyle, 'name'>>): void {
        if (this.readonlyStyles.includes(name)) {
            return;
        }
        const style = this.getTextStyle(name);
        if (style) {
            Object.assign(style, newProps);
        }
    }
    
    public getAllTextStyles(): TextStyle[] {
        return Array.from(this.textStyles.values());
    }

    public getAllTextStyleNames(): string[] {
        return Array.from(this.textStyles.keys());
    }
    
    public setCurrentTextStyle(name: string): void {
        if (this.textStyles.has(name)) {
            this.currentTextStyleName = name;
        }
    }

    // --- Dimension Styles ---
    public getDimensionStyle(name: string): DimensionStyle | undefined {
        return this.dimensionStyles.get(name);
    }

    public getCurrentDimensionStyleName(): string {
        return this.currentDimensionStyleName;
    }

    public addDimensionStyle(style: DimensionStyle): void {
        if (!this.dimensionStyles.has(style.name)) {
            this.dimensionStyles.set(style.name, style);
        }
    }

    public deleteDimensionStyle(name: string): boolean {
        if (this.readonlyStyles.includes(name) || !this.dimensionStyles.has(name)) {
            return false;
        }
        // TODO: Check if the style is in use by any dimension objects
        this.dimensionStyles.delete(name);
        if (this.currentDimensionStyleName === name) {
            this.currentDimensionStyleName = 'Standard';
        }
        return true;
    }

    public updateDimensionStyle(name: string, newProps: Partial<Omit<DimensionStyle, 'name'>>): void {
        if (this.readonlyStyles.includes(name)) {
            return;
        }
        const style = this.getDimensionStyle(name);
        if (style) {
            Object.assign(style, newProps);
        }
    }

    public getAllDimensionStyles(): DimensionStyle[] {
        return Array.from(this.dimensionStyles.values());
    }

    public getAllDimensionStyleNames(): string[] {
        return Array.from(this.dimensionStyles.keys());
    }

    public setCurrentDimensionStyle(name: string): void {
        if (this.dimensionStyles.has(name)) {
            this.currentDimensionStyleName = name;
        }
    }

    toJSON() {
        return {
            textStyles: Array.from(this.textStyles.values()).map(style => style.toJSON()),
            currentTextStyleName: this.currentTextStyleName,
            dimensionStyles: Array.from(this.dimensionStyles.values()).map(style => style.toJSON()),
            currentDimensionStyleName: this.currentDimensionStyleName,
        };
    }

    fromJSON(data: any) {
        this.textStyles.clear();
        this.createDefaultStyles(); // Start with a clean set of defaults

        if (data && data.textStyles) {
            data.textStyles.forEach((styleData: any) => {
                // Add non-default styles from the saved file.
                // This prevents old files from removing new default styles.
                if (!this.textStyles.has(styleData.name)) {
                    const style = TextStyle.fromJSON(styleData);
                    this.textStyles.set(style.name, style);
                }
            });
        }
        
        this.currentTextStyleName = data?.currentTextStyleName || 'Standard';
        // Fallback if current style from file doesn't exist anymore
        if (!this.textStyles.has(this.currentTextStyleName)) {
            this.currentTextStyleName = 'Standard';
        }

        // --- Load Dimension Styles ---
        this.dimensionStyles.clear();
        const standardDimStyle = new DimensionStyle('Standard'); // Ensure default is re-added
        this.dimensionStyles.set(standardDimStyle.name, standardDimStyle);
        
        if (data && data.dimensionStyles) {
            data.dimensionStyles.forEach((styleData: any) => {
                if (styleData.name !== 'Standard') { // Don't re-add standard
                    const style = DimensionStyle.fromJSON(styleData);
                    this.dimensionStyles.set(style.name, style);
                }
            });
        }

        this.currentDimensionStyleName = data?.currentDimensionStyleName || 'Standard';
        if (!this.dimensionStyles.has(this.currentDimensionStyleName)) {
            this.currentDimensionStyleName = 'Standard';
        }
    }
}