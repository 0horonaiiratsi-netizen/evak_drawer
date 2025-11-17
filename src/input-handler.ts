/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from './app';
import { Point } from './scene/point';
import { SceneObject } from './scene/scene-object';
import { TextObject } from './scene/text-object';
import { Tool, ToolType } from './tools/tool';
import { SELECTION_TOLERANCE } from './constants';
import { GroupObject } from './scene/group-object';
import { SelectTool } from './tools/select-tool';

export class InputHandler {
    private app: App;
    private canvas: HTMLCanvasElement;
    isSpacebarPressed = false;
    private isPanning = false;
    private lastPanPosition: Point = { x: 0, y: 0 };
    private arrowMoveTimeout: number | null = null;
    public currentWorldPosition: Point = { x: 0, y: 0 };

    /**
     * Конструктор класу InputHandler.
     * @param app Екземпляр головного класу додатку.
     */
    constructor(app: App) {
        this.app = app;
        this.canvas = app.canvasController.canvasElement;
    }

    /**
     * Ініціалізує всі слухачі подій (миші, клавіатури, колеса).
     */
    init(): void {
        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', this.onMouseLeave.bind(this));
        this.canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
        this.canvas.addEventListener('contextmenu', this.onContextMenu.bind(this));
        this.canvas.addEventListener('dblclick', this.onDoubleClick.bind(this));
        window.addEventListener('keydown', this.onKeyDown.bind(this));
        window.addEventListener('keyup', this.onKeyUp.bind(this));
    }
    
    /**
     * Визначає, який інструмент є ефективним у даний момент (враховуючи команди та панорамування).
     */
    private getEffectiveTool(): Tool {
        const activeCommand = this.app.commandManager.activeCommand;
        if (activeCommand) {
            return activeCommand;
        }
        if (this.isSpacebarPressed && this.app.activeTool.type !== ToolType.PAN) {
            return this.app.getTool(ToolType.PAN)!;
        }
        return this.app.activeTool;
    }

    /**
     * Обробляє подію натискання кнопки миші.
     * @param event Подія MouseEvent.
     */
    private onMouseDown(event: MouseEvent): void {
        const worldPoint = this.app.canvasController.screenToWorld({ x: event.clientX, y: event.clientY });
        
        if (event.button === 1 || (event.button === 0 && this.isSpacebarPressed)) {
            this.isPanning = true;
            this.lastPanPosition = { x: event.clientX, y: event.clientY };
            this.canvas.style.cursor = 'grabbing';
            this.canvas.classList.remove('pickbox-cursor');
            return;
        }
        
        if (event.button === 2) { 
            return;
        }

        if (event.button !== 0) return;
        
        this.getEffectiveTool().onMouseDown(worldPoint, event);
    }
    
    /**
     * Обробляє подію руху миші.
     * @param event Подія MouseEvent.
     */
    private onMouseMove(event: MouseEvent): void {
        const worldPoint = this.app.canvasController.screenToWorld({ x: event.clientX, y: event.clientY });
        this.currentWorldPosition = worldPoint;
        this.app.statusBarController.updateCoordinates(worldPoint);

        if (this.isPanning) {
            const dx = (event.clientX - this.lastPanPosition.x) * devicePixelRatio;
            const dy = (event.clientY - this.lastPanPosition.y) * devicePixelRatio;
            this.app.canvasController.panOffset.x += dx;
            this.app.canvasController.panOffset.y += dy;
            this.lastPanPosition = { x: event.clientX, y: event.clientY };
            this.app.draw();
            return;
        }
        
        const effectiveTool = this.getEffectiveTool();
        effectiveTool.onMouseMove(worldPoint, event);
        this.updateCursor(effectiveTool.getCursor());
        this.app.draw();
    }
    
    /**
     * Обробляє подію відпускання кнопки миші.
     * @param event Подія MouseEvent.
     */
    private onMouseUp(event: MouseEvent): void {
        const worldPoint = this.app.canvasController.screenToWorld({ x: event.clientX, y: event.clientY });
        
        if (this.isPanning && (event.button === 1 || event.button === 0)) {
            this.isPanning = false;
            this.updateCursor(this.getEffectiveTool().getCursor());
            return;
        }
        
        this.getEffectiveTool().onMouseUp(worldPoint, event);
    }

    /**
     * Обробляє подію контекстного меню (права кнопка миші).
     * @param event Подія MouseEvent.
     */
    private onContextMenu(event: MouseEvent): void {
        event.preventDefault();
        const worldPoint = this.app.canvasController.screenToWorld({ x: event.clientX, y: event.clientY });
        const screenPoint = { x: event.clientX, y: event.clientY };
        this.getEffectiveTool().onContextMenu(worldPoint, screenPoint);
    }
    
    /**
     * Обробляє подію, коли курсор миші залишає межі canvas.
     * @param event Подія MouseEvent.
     */
    private onMouseLeave(event: MouseEvent): void {
        if (this.isPanning) {
            this.onMouseUp(event);
        }
    }
    
    /**
     * Обробляє подію прокрутки колеса миші (для масштабування).
     * @param event Подія WheelEvent.
     */
    private onWheel(event: WheelEvent): void {
        this.app.canvasController.zoomOnWheel(event);
    }

    /**
     * Обробляє подію подвійного кліку миші (для редагування тексту, входу в групу).
     * @param event Подія MouseEvent.
     */
    private onDoubleClick(event: MouseEvent): void {
        if (this.app.commandManager.activeCommand) return; // Ignore during commands

        const worldPoint = this.app.canvasController.screenToWorld({ x: event.clientX, y: event.clientY });
        const tolerance = SELECTION_TOLERANCE / this.app.canvasController.zoom;
        
        // FIX: Use sceneService to get objects.
        const objectsToCheck = this.app.sceneService.getVisibleObjectsSortedForRender();

        const clickedObject = [...objectsToCheck]
            .reverse()
            .find(obj => {
                // FIX: Use layerService to get layer.
                const layer = this.app.layerService.getLayerForObject(obj.id);
                return (!layer || !layer.isLocked) && obj.contains(worldPoint, tolerance, this.app);
            });
        
        if (clickedObject) {
            if (clickedObject instanceof TextObject) {
                this.app.startTextEditing(clickedObject);
            } else if (clickedObject instanceof GroupObject) {
                this.app.enterGroupEdit(clickedObject);
            }
        } else if (this.app.groupEditContext) {
            this.app.exitGroupEdit();
        }
    }
    
    /**
     * Обробляє подію натискання клавіші на клавіатурі.
     * @param event Подія KeyboardEvent.
     */
    private onKeyDown(event: KeyboardEvent): void {
        const commandInput = document.getElementById('command-input') as HTMLInputElement;
        const isInputFocused = document.activeElement instanceof HTMLInputElement ||
                             document.activeElement instanceof HTMLTextAreaElement ||
                             document.activeElement instanceof HTMLSelectElement;

        // Give command input field priority
        if (isInputFocused && document.activeElement === commandInput) {
            // Let CommandLineController handle it, but also pass to command for live feedback
            this.getEffectiveTool().onKeyDown(event);
            return;
        }

        // Give other input fields (like properties panel) priority over global shortcuts
        if (isInputFocused && document.activeElement !== commandInput) {
             this.getEffectiveTool().onKeyDown(event);
            return;
        }

        if (event.ctrlKey || event.metaKey) {
            let handled = false;
            switch (event.key.toLowerCase()) {
                // FIX: Use projectStateService for undo/redo.
                case 'z': event.shiftKey ? this.app.projectStateService.redo() : this.app.projectStateService.undo(); handled = true; break;
                // FIX: Use projectStateService for redo.
                case 'y': this.app.projectStateService.redo(); handled = true; break;
                // FIX: Use projectStateService for copy/paste.
                case 'c': this.app.projectStateService.copySelection(); handled = true; break;
                case 'v': this.app.projectStateService.pasteFromClipboard(); handled = true; break;
                case 'd': this.app.duplicateSelection(); handled = true; break;
                case 'g': event.shiftKey ? this.app.ungroupSelectedObjects() : this.app.groupSelectedObjects(); handled = true; break;
            }
            if (handled) {
                event.preventDefault();
                return;
            }
        }
        
        // Arrow key movement for selected object (only if no command is active)
        if (!this.app.commandManager.activeCommand) {
            switch (event.key) {
                case 'ArrowUp':
                case 'ArrowDown':
                case 'ArrowLeft':
                case 'ArrowRight':
                    if (this.app.selectedObjectIds.length > 0) {
                        // FIX: Use sceneService to get objects.
                        const objects = this.app.groupEditContext ? this.app.groupEditContext.objects : this.app.sceneService.objects;
                        const selectedObjects = objects.filter(obj => this.app.selectedObjectIds.includes(obj.id));
                        // FIX: Use layerService to get layer.
                        const unlockedObjects = selectedObjects.filter(obj => !this.app.layerService.getLayerForObject(obj.id)?.isLocked);

                        if (unlockedObjects.length > 0) {
                            const distance = event.shiftKey ? 10 : 1;
                            let dx = 0, dy = 0;
                            if (event.key === 'ArrowUp') dy = -distance;
                            if (event.key === 'ArrowDown') dy = distance;
                            if (event.key === 'ArrowLeft') dx = -distance;
                            if (event.key === 'ArrowRight') dx = distance;
                            
                            unlockedObjects.forEach(obj => obj.move(dx, dy, this.app));
                            this.handleArrowMove(unlockedObjects);
                            event.preventDefault();
                        }
                    }
                    return;
            }
        }

        if (event.code === 'Space' && !this.isSpacebarPressed) {
            this.isSpacebarPressed = true;
            this.updateCursor(this.getEffectiveTool().getCursor());
        }
        if (event.key === 'Escape') {
            if (this.app.commandManager.activeCommand) {
                this.app.commandManager.cancelCommand();
            } else if (this.app.groupEditContext) {
                this.app.exitGroupEdit();
            } else {
                this.app.setSelectedObjectIds([]);
            }
        }
        if (event.key === 'Delete' || event.key === 'Backspace') {
            if (this.app.selectedObjectIds.length > 0 && !this.app.commandManager.activeCommand) {
                this.app.deleteSelectedObjects();
            }
        }
        
        // Let the active command/tool handle other keys
        this.getEffectiveTool().onKeyDown(event);
    }
    
    /**
     * Обробляє переміщення об'єкта стрілками з затримкою для збереження в історію.
     * @param movedObjects Масив об'єктів, які були переміщені.
     */
    private handleArrowMove(movedObjects: SceneObject[]): void {
        if (this.arrowMoveTimeout) {
            clearTimeout(this.arrowMoveTimeout);
        }
        this.app.draw();
        this.arrowMoveTimeout = window.setTimeout(() => {
            // FIX: Use projectStateService to commit state.
            this.app.projectStateService.commit("Move object(s) with arrows");
            this.app.propertiesController.onSelectionChanged(movedObjects);
        }, 500);
    }

    /**
     * Обробляє подію відпускання клавіші на клавіатурі.
     * @param event Подія KeyboardEvent.
     */
    private onKeyUp(event: KeyboardEvent): void {
        if (event.code === 'Space') {
            this.isSpacebarPressed = false;
            if (this.isPanning) {
                this.isPanning = false;
            }
            this.updateCursor(this.getEffectiveTool().getCursor());
        }
         this.getEffectiveTool().onKeyUp(event);
    }
    
    /**
     * Оновлює вигляд курсору на canvas.
     * @param cursor Рядок, що представляє стиль курсору (CSS або спеціальний).
     */
    public updateCursor(cursor: string): void {
        const specialCursorsMap: {[key: string]: string} = {
            'pickbox': 'pickbox-cursor',
            'rotate-cursor': 'rotate-cursor'
        };
        
        // Remove all possible special cursor classes
        Object.values(specialCursorsMap).forEach(className => this.canvas.classList.remove(className));
    
        if (specialCursorsMap[cursor]) {
            this.canvas.classList.add(specialCursorsMap[cursor]);
            this.canvas.style.cursor = ''; // Let the class handle it
        } else {
            this.canvas.style.cursor = cursor; // Standard CSS cursor
        }
    }
}
