/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "../app";
import { Point } from "../scene/point";
import { TextObject } from "../scene/text-object";
import { Tool, ToolType } from "./tool";

export class TextTool extends Tool {
    constructor(app: App) {
        super(app, ToolType.TEXT);
    }

    onMouseDown(point: Point, _event: MouseEvent): void {
        const styleName = this.app.styleManager.getCurrentTextStyleName();
        const newTextObject = new TextObject(
            this.app.sceneService.getNextId(),
            point.x,
            point.y,
            'Текст',
            styleName
        );

        this.app.addSceneObject(newTextObject);
        // Activate inline editing immediately for a better user experience
        this.app.startTextEditing(newTextObject);
    }
    
    getCursor(): string {
        return 'text';
    }
}