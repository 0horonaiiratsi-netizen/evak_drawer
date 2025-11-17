/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from './app';
import { TextObject } from './scene/text-object';
import { ToolType } from './tools/tool';

export class InlineTextEditor {
    private app: App;
    private editor: HTMLTextAreaElement;
    private activeObject: TextObject | null = null;

    constructor(app: App) {
        this.app = app;
        this.editor = document.createElement('textarea');
        this.setupEditorStyles();
        document.body.appendChild(this.editor);
    }

    private setupEditorStyles(): void {
        const style = this.editor.style;
        style.position = 'absolute';
        style.display = 'none';
        style.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--background-color');
        style.border = `1px dashed ${getComputedStyle(document.documentElement).getPropertyValue('--selected-stroke-color')}`;
        style.color = getComputedStyle(document.documentElement).getPropertyValue('--text-color');
        style.padding = '0';
        style.margin = '0';
        style.zIndex = '20';
        style.resize = 'none';
        style.overflow = 'hidden';
        style.outline = 'none';
        style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif';
        style.lineHeight = '1.1'; // A bit more space for editing
        style.whiteSpace = 'pre'; // Preserve spaces
    }

    startEditing(textObject: TextObject): void {
        if (this.activeObject) {
            this.finishEditing();
        }
        this.activeObject = textObject;

        const screenPos = this.app.canvasController.worldToScreen({ x: textObject.x, y: textObject.y });
        const style = this.app.styleManager.getTextStyle(textObject.styleName);

        this.editor.value = textObject.text;
        this.editor.style.display = 'block';
        this.editor.style.left = `${screenPos.x}px`;
        this.editor.style.top = `${screenPos.y}px`;
        this.editor.style.fontFamily = style?.fontFamily || 'system-ui, sans-serif';
        this.editor.style.fontSize = `${textObject.height * this.app.canvasController.zoom}px`;
        
        // Use a dummy element to calculate initial size
        this.updateEditorSize();

        this.editor.focus();
        this.editor.select();

        this.editor.addEventListener('blur', this.finishEditing);
        this.editor.addEventListener('input', this.onInput);
        this.editor.addEventListener('keydown', this.onKeyDown);
    }

    private onInput = (): void => {
        this.updateEditorSize();
        if (this.activeObject) {
            // FIX: Corrected method name and added `false` to prevent creating history on every keystroke.
            this.app.updateSelectedObjectsProperty('text', this.editor.value, false);
        }
    }

    private updateEditorSize(): void {
        if (!this.activeObject) return;
        // Simple auto-sizing: set height to scrollHeight
        this.editor.style.height = 'auto';
        this.editor.style.height = `${this.editor.scrollHeight}px`;
        
        const style = this.app.styleManager.getTextStyle(this.activeObject.styleName);
        this.app.canvasController.ctx.font = `${this.activeObject.height}px ${style?.fontFamily || 'system-ui, sans-serif'}`;
        const textWidth = this.app.canvasController.ctx.measureText(this.editor.value).width;
        this.editor.style.width = `${(textWidth * this.app.canvasController.zoom) + 20}px`; // Add some padding
    }
    
    private onKeyDown = (e: KeyboardEvent): void => {
        // Finish editing on Enter (but not Shift+Enter for newline)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.finishEditing();
        }
        // Finish editing on Escape
        if (e.key === 'Escape') {
            // Restore original text on escape
            this.editor.value = this.activeObject?.text ?? '';
            this.finishEditing();
        }
    }
    
    // Use an arrow function to preserve 'this' context
    private finishEditing = (): void => {
        if (!this.activeObject) return;
        
        // Final update to the object model
        // FIX: The default `recordHistory=true` is correct here. This call commits the final text to history.
        this.app.updateSelectedObjectsProperty('text', this.editor.value);
        
        this.activeObject = null;
        this.editor.style.display = 'none';
        this.editor.removeEventListener('blur', this.finishEditing);
        this.editor.removeEventListener('input', this.onInput);
        this.editor.removeEventListener('keydown', this.onKeyDown);
        
        this.app.draw();
        
        // For better UX, switch back to the select tool after text creation
        this.app.setActiveTool(ToolType.SELECT);
    }
}