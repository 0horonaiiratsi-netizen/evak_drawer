/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "./app";
import { SymbolObject, SymbolType } from "./scene/symbol-object";

export class SymbolPaletteController {
    private app: App;
    private canvas: HTMLCanvasElement;

    /**
     * Конструктор контролера палітри символів.
     * @param app Екземпляр головного класу додатку.
     */
    constructor(app: App) {
        this.app = app;
        this.canvas = this.app.canvasController.canvasElement;
        this.init();
    }

    /**
     * Ініціалізує слухачі подій Drag and Drop.
     */
    private init(): void {
        document.querySelectorAll<HTMLElement>('[data-symbol-type]').forEach(el => {
            el.addEventListener('dragstart', this.handleDragStart.bind(this));
        });

        this.canvas.addEventListener('dragover', this.handleDragOver.bind(this));
        this.canvas.addEventListener('drop', this.handleDrop.bind(this));
    }

    /**
     * Обробляє початок перетягування символу з палітри.
     * @param event Подія DragEvent.
     */
    private handleDragStart(event: DragEvent): void {
        const target = event.target as HTMLElement;
        const symbolType = target.closest('[data-symbol-type]')?.getAttribute('data-symbol-type');
        if (event.dataTransfer && symbolType) {
            event.dataTransfer.setData('text/plain', symbolType);
            event.dataTransfer.effectAllowed = 'copy';
        }
    }

    /**
     * Обробляє перетягування символу над canvas.
     * @param event Подія DragEvent.
     */
    private handleDragOver(event: DragEvent): void {
        event.preventDefault();
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'copy';
        }
    }

    /**
     * Обробляє розміщення символу на canvas.
     * @param event Подія DragEvent.
     */
    private handleDrop(event: DragEvent): void {
        event.preventDefault();
        const symbolType = event.dataTransfer?.getData('text/plain') as SymbolType;
        if (!symbolType || !Object.values(SymbolType).includes(symbolType)) {
            return;
        }

        const worldPoint = this.app.canvasController.screenToWorld({ x: event.clientX, y: event.clientY });
        
        const symbol = new SymbolObject(
            this.app.sceneService.getNextId(),
            worldPoint.x,
            worldPoint.y,
            symbolType
        );
        
        this.app.addSceneObject(symbol);
        this.app.setSelectedObjectId(symbol.id);
    }
}
