/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from './app';
import { Point } from './scene/point';
import { GRID_SIZE_MAJOR, GRID_SIZE_MINOR, MAX_ZOOM, MIN_ZOOM, ZOOM_SENSITIVITY } from './constants';
import { BoundingBox, SceneObject } from './scene/scene-object';
import { GroupObject } from './scene/group-object';
import { SelectTool } from './tools/select-tool';
import { ToolType } from './tools/tool';
import { SymbolObject, SymbolType, SYMBOL_RENDERERS } from './scene/symbol-object';
import { Wall } from './scene/wall';
import { TextObject } from './scene/text-object';
import { DimensionObject } from './scene/dimension-object';

declare const jspdf: any;

const symbolNameMap: Record<SymbolType, string> = {
    [SymbolType.FIRE_EXTINGUISHER]: 'Вогнегасник',
    [SymbolType.EXIT]: 'Вихід',
    [SymbolType.FIRST_AID]: 'Аптечка першої допомоги',
    [SymbolType.FIRE_HYDRANT]: 'Пожежний щит',
    [SymbolType.ELECTRICAL_PANEL]: 'Електрощитова',
    [SymbolType.COLUMN]: 'Колона',
    [SymbolType.GEODETIC_POINT]: 'Точка знімальної мережі',
    [SymbolType.MANHOLE]: 'Люк колодязя',
    [SymbolType.POWER_POLE]: 'Опора ЛЕП',
    [SymbolType.LAMPPOST]: 'Опора ліхтаря',
    [SymbolType.DECIDUOUS_TREE]: 'Дерево листяне',
    [SymbolType.CONIFEROUS_TREE]: 'Дерево хвойне',
};

export class CanvasController {
    private canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D; // Made public for text measurement
    private app: App;

    zoom = 1;
    panOffset: Point = { x: 0, y: 0 };
    
    private previewLine: { p1: Point, p2: Point } | null = null;
    public guideLines: { p1: Point, p2: Point }[] = [];

    /**
     * Конструктор класу CanvasController.
     * @param canvas HTML-елемент canvas, на якому буде відбуватися малювання.
     * @param app Екземпляр головного класу додатку.
     */
    constructor(canvas: HTMLCanvasElement, app: App) {
        this.canvas = canvas;
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Could not get 2D rendering context');
        }
        this.ctx = context;
        this.app = app;
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }
    
    /**
     * Повертає HTML-елемент canvas.
     */
    get canvasElement(): HTMLCanvasElement {
        return this.canvas;
    }

    /**
     * Повертає загальний коефіцієнт масштабування, враховуючи devicePixelRatio.
     */
    get zoomFactor(): number {
        return this.zoom * devicePixelRatio;
    }

    /**
     * Обробляє зміну розміру вікна браузера, адаптуючи розміри canvas.
     */
    resize(): void {
        this.canvas.width = window.innerWidth * devicePixelRatio;
        this.canvas.height = window.innerHeight * devicePixelRatio;
        this.canvas.style.width = `${window.innerWidth}px`;
        this.canvas.style.height = `${window.innerHeight}px`;
        this.draw();
    }

    /**
     * Головний метод для перемальовування всієї сцени.
     */
    draw(): void {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();
        this.ctx.translate(this.panOffset.x, this.panOffset.y);
        this.ctx.scale(this.zoomFactor, this.zoomFactor);
        
        this.drawGrid();
        this.drawObjects();

        if (this.app.groupEditContext) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(-this.panOffset.x / this.zoomFactor, -this.panOffset.y / this.zoomFactor, this.canvas.width / this.zoomFactor, this.canvas.height / this.zoomFactor);
            
            const groupObjects = this.app.groupEditContext.objects;
            groupObjects.forEach(obj => obj.draw(this.ctx, this.app.selectionService.selectedIds.includes(obj.id), this.zoom, groupObjects, this.app));
            
            const bbox = this.app.groupEditContext.getBoundingBox(this.app);
            this.ctx.strokeStyle = '#00ffff';
            this.ctx.lineWidth = 2 / this.zoom;
            this.ctx.setLineDash([8 / this.zoom, 4 / this.zoom]);
            this.ctx.strokeRect(bbox.minX, bbox.minY, bbox.maxX - bbox.minX, bbox.maxY - bbox.minY);
            this.ctx.setLineDash([]);
        }

        this.drawGuideLines();
        this.drawPreview();
        
        const activeCommand = this.app.commandManager.activeCommand;
        if (activeCommand) {
            activeCommand.drawOverlay(this.ctx, this.zoom);
        } else if (this.app.activeTool) {
            this.app.activeTool.drawOverlay(this.ctx, this.zoom);
        }
        
        this.ctx.restore();
    }
    
    /**
     * Встановлює точки для лінії попереднього перегляду (гумової лінії).
     * @param p1 Початкова точка лінії.
     * @param p2 Кінцева точка лінії.
     */
    setPreviewLine(p1: Point | null, p2?: Point) {
        if (p1 && p2) {
            this.previewLine = { p1, p2 };
        } else {
            this.previewLine = null;
        }
        this.draw();
    }
    
    /**
     * Малює лінію попереднього перегляду.
     */
    private drawPreview(): void {
        if (this.previewLine) {
            this.ctx.strokeStyle = '#0099ff';
            this.ctx.lineWidth = 3 / this.zoom;
            this.ctx.setLineDash([6 / this.zoom, 4 / this.zoom]);
            this.ctx.beginPath();
            this.ctx.moveTo(this.previewLine.p1.x, this.previewLine.p1.y);
            this.ctx.lineTo(this.previewLine.p2.x, this.previewLine.p2.y);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
    }

    /**
     * Малює напрямні лінії для прив'язки.
     */
    private drawGuideLines(): void {
        if (this.guideLines.length === 0) return;

        this.ctx.save();
        this.ctx.strokeStyle = '#ff00ff'; // Magenta for guide lines
        this.ctx.lineWidth = 1 / this.zoom;
        this.ctx.setLineDash([4 / this.zoom, 4 / this.zoom]);

        this.guideLines.forEach(line => {
            this.ctx.beginPath();
            this.ctx.moveTo(line.p1.x, line.p1.y);
            this.ctx.lineTo(line.p2.x, line.p2.y);
            this.ctx.stroke();
        });

        this.ctx.restore();
    }

    /**
     * Малює всі видимі об'єкти сцени у правильному порядку.
     */
    private drawObjects(): void {
        const objectsToDraw = this.app.sceneService.getVisibleObjectsSortedForRender();
        const selectedIdsInCurrentContext = new Set(this.app.selectionService.selectedIds);
    
        const walls = objectsToDraw.filter(o => o instanceof Wall) as Wall[];
        const nonWalls = objectsToDraw.filter(o => !(o instanceof Wall));
    
        walls.forEach(wall => {
            wall.drawFill(this.ctx);
        });
    
        nonWalls.forEach(obj => {
            const isSelected = this.app.groupEditContext
                ? false
                : selectedIdsInCurrentContext.has(obj.id);
            obj.draw(this.ctx, isSelected, this.zoom, objectsToDraw, this.app);
        });
        
        walls.forEach(wall => {
            const isSelected = this.app.groupEditContext
                ? false
                : selectedIdsInCurrentContext.has(wall.id);
            wall.drawStroke(this.ctx, isSelected, this.zoom, objectsToDraw, this.app);
        });
    }

    /**
     * Малює фонову сітку.
     */
    private drawGrid(): void {
        const majorLineColor = getComputedStyle(document.documentElement).getPropertyValue('--grid-line-color-major');
        const minorLineColor = getComputedStyle(document.documentElement).getPropertyValue('--grid-line-color-minor');

        const view = {
            x: -this.panOffset.x / this.zoomFactor,
            y: -this.panOffset.y / this.zoomFactor,
            width: this.canvas.width / this.zoomFactor,
            height: this.canvas.height / this.zoomFactor,
        };

        this.ctx.lineWidth = 1 / this.zoomFactor;

        this.ctx.strokeStyle = minorLineColor;
        this.ctx.beginPath();
        for (let x = Math.floor(view.x / GRID_SIZE_MINOR) * GRID_SIZE_MINOR; x < view.x + view.width; x += GRID_SIZE_MINOR) {
            this.ctx.moveTo(x, view.y);
            this.ctx.lineTo(x, view.y + view.height);
        }
        for (let y = Math.floor(view.y / GRID_SIZE_MINOR) * GRID_SIZE_MINOR; y < view.y + view.height; y += GRID_SIZE_MINOR) {
            this.ctx.moveTo(view.x, y);
            this.ctx.lineTo(view.x + view.width, y);
        }
        this.ctx.stroke();

        this.ctx.strokeStyle = majorLineColor;
        this.ctx.beginPath();
        for (let x = Math.floor(view.x / GRID_SIZE_MAJOR) * GRID_SIZE_MAJOR; x < view.x + view.width; x += GRID_SIZE_MAJOR) {
            this.ctx.moveTo(x, view.y);
            this.ctx.lineTo(x, view.y + view.height);
        }
        for (let y = Math.floor(view.y / GRID_SIZE_MAJOR) * GRID_SIZE_MAJOR; y < view.y + view.height; y += GRID_SIZE_MAJOR) {
            this.ctx.moveTo(view.x, y);
            this.ctx.lineTo(view.x + view.width, y);
        }
        this.ctx.stroke();
    }

    /**
     * Обробляє подію масштабування колесом миші.
     * @param event Подія WheelEvent.
     */
    zoomOnWheel(event: WheelEvent): void {
        event.preventDefault();
        const mouseX = event.clientX * devicePixelRatio;
        const mouseY = event.clientY * devicePixelRatio;
        const worldX = (mouseX - this.panOffset.x) / this.zoomFactor;
        const worldY = (mouseY - this.panOffset.y) / this.zoomFactor;
        const delta = event.deltaY * ZOOM_SENSITIVITY;
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.zoom * (1 - delta)));
        this.panOffset.x = mouseX - worldX * newZoom * devicePixelRatio;
        this.panOffset.y = mouseY - worldY * newZoom * devicePixelRatio;
        this.zoom = newZoom;
        this.draw();
    }
    
    /**
     * Перетворює екранні координати у світові.
     * @param screenPoint Точка в екранних координатах.
     */
    screenToWorld(screenPoint: Point): Point {
        const worldX = (screenPoint.x * devicePixelRatio - this.panOffset.x) / this.zoomFactor;
        const worldY = (screenPoint.y * devicePixelRatio - this.panOffset.y) / this.zoomFactor;
        return { x: worldX, y: worldY };
    }

    /**
     * Перетворює світові координати в екранні.
     * @param worldPoint Точка у світових координатах.
     */
    worldToScreen(worldPoint: Point): Point {
        const screenX = (worldPoint.x * this.zoomFactor + this.panOffset.x) / devicePixelRatio;
        const screenY = (worldPoint.y * this.zoomFactor + this.panOffset.y) / devicePixelRatio;
        return { x: screenX, y: screenY };
    }
    
    /**
     * Рендерить сцену на тимчасовий (offscreen) canvas для експорту.
     * @param boundingBox Габаритний прямокутник об'єктів для експорту.
     */
    private _renderToOffscreenCanvas(boundingBox: BoundingBox): HTMLCanvasElement {
        const PADDING = 50; // pixels of padding around the drawing

        const width = boundingBox.maxX - boundingBox.minX;
        const height = boundingBox.maxY - boundingBox.minY;

        if (width <= 0 || height <= 0) {
            throw new Error("Cannot export empty or zero-sized drawing.");
        }

        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = width + PADDING * 2;
        offscreenCanvas.height = height + PADDING * 2;

        const ctx = offscreenCanvas.getContext('2d');
        if (!ctx) {
            throw new Error("Could not create offscreen canvas context for export.");
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);

        ctx.translate(-boundingBox.minX + PADDING, -boundingBox.minY + PADDING);

        const objectsToDraw = this.app.sceneService.getVisibleObjectsSortedForRender();
        const walls = objectsToDraw.filter(o => o instanceof Wall) as Wall[];
        const nonWalls = objectsToDraw.filter(o => !(o instanceof Wall));

        walls.forEach(wall => {
            wall.drawFill(ctx);
        });
    
        walls.forEach(wall => {
            wall.drawStroke(ctx, false, 1, objectsToDraw, this.app);
        });

        nonWalls.forEach(obj => {
            obj.draw(ctx, false, 1, objectsToDraw, this.app);
        });


        return offscreenCanvas;
    }

    /**
     * Експортує сцену у формат PNG.
     * @param boundingBox Габаритний прямокутник для експорту.
     */
    exportAsPNG(boundingBox: BoundingBox): void {
        try {
            const offscreenCanvas = this._renderToOffscreenCanvas(boundingBox);
            const dataUrl = offscreenCanvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = 'evacuation-plan.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (error: any) {
            console.warn(error.message);
        }
    }
    
    private drawLegend(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        width: number,
        height: number,
        uniqueSymbolTypes: SymbolType[],
        allSymbolObjects: SymbolObject[],
        scaleFactor: number
    ) {
        ctx.save();
        ctx.strokeStyle = '#000000';
        ctx.fillStyle = '#000000';

        const padding = 8 * scaleFactor;
        ctx.strokeRect(x, y, width, height);
        
        const titleY = y + padding * 1.5;
        ctx.font = `bold ${10 * scaleFactor}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText("Умовні позначення", x + width / 2, titleY);
    
        let currentY = titleY + 15 * scaleFactor;
        const symbolDrawSize = 16 * scaleFactor;
        const rowHeight = 22 * scaleFactor;
        
        ctx.font = `${9 * scaleFactor}px Arial`;
        ctx.textAlign = 'left';
    
        for (const type of uniqueSymbolTypes) {
            if (currentY + rowHeight > y + height) break;

            const representativeSymbol = allSymbolObjects.find(obj => obj.symbolType === type);
            if (!representativeSymbol) continue;
            
            const name = symbolNameMap[type] || type;
            const symbolX = x + padding;
            
            ctx.save();
            ctx.translate(symbolX + symbolDrawSize / 2, currentY);
            const symbolScale = symbolDrawSize / 24;
            ctx.scale(symbolScale, symbolScale);
            const renderer = SYMBOL_RENDERERS[type];
            if (renderer) {
                renderer(ctx, false, representativeSymbol.color);
            }
            ctx.restore();
    
            const textX = symbolX + symbolDrawSize + (5 * scaleFactor);
            ctx.fillText(name, textX, currentY);
            
            currentY += rowHeight;
        }
        ctx.restore();
    }
    
    private drawTitleBlock(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        scaleFactor: number
    ) {
        ctx.save();
        ctx.translate(x, y);
        ctx.strokeStyle = '#000000';
        ctx.fillStyle = '#000000';
        ctx.lineWidth = 1;

        const mmToPt = (mm: number) => (mm / 25.4 * 72) * scaleFactor;

        const colWidths_mm = [25, 65, 40, 55];
        const rowHeights_mm = [10, 15, 15, 15];
        
        const colWidths = colWidths_mm.map(mmToPt);
        const rowHeights = rowHeights_mm.map(mmToPt);

        const colPos = [0, ...colWidths].map((_w, i, arr) => arr.slice(0, i + 1).reduce((a, b) => a + b, 0));
        const rowPos = [0, ...rowHeights].map((_h, i, arr) => arr.slice(0, i + 1).reduce((a, b) => a + b, 0));

        ctx.beginPath();
        
        ctx.moveTo(colPos[0], rowPos[0]); ctx.lineTo(colPos[0], rowPos[4]);
        ctx.moveTo(colPos[1], rowPos[0]); ctx.lineTo(colPos[1], rowPos[4]);
        ctx.moveTo(colPos[2], rowPos[0]); ctx.lineTo(colPos[2], rowPos[4]);
        ctx.moveTo(colPos[3], rowPos[0]); ctx.lineTo(colPos[3], rowPos[4]);
        ctx.moveTo(colPos[4], rowPos[0]); ctx.lineTo(colPos[4], rowPos[4]);

        ctx.moveTo(colPos[0], rowPos[0]); ctx.lineTo(colPos[4], rowPos[0]);
        ctx.moveTo(colPos[0], rowPos[1]); ctx.lineTo(colPos[3], rowPos[1]);
        ctx.moveTo(colPos[0], rowPos[2]); ctx.lineTo(colPos[3], rowPos[2]);
        ctx.moveTo(colPos[0], rowPos[3]); ctx.lineTo(colPos[4], rowPos[3]);
        ctx.moveTo(colPos[0], rowPos[4]); ctx.lineTo(colPos[4], rowPos[4]);

        ctx.stroke();

        const addText = (
            text: string,
            colIndex: number,
            rowIndex: number,
            bold: boolean = false,
            size_mm: number = 3
        ) => {
            const cellX = colPos[colIndex];
            const cellY = rowPos[rowIndex];
            const cellW = colWidths[colIndex];
            const cellH = rowHeights[rowIndex];

            ctx.font = `${bold ? 'bold ' : ''}${mmToPt(size_mm)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, cellX + cellW / 2, cellY + cellH / 2);
        };

        addText("П.І.Б.", 1, 0, true, 3.5);
        addText("Підпис", 2, 0, true, 3.5);

        addText("Розробив", 0, 1);
        addText("Перевірив", 0, 2);
        addText("Затвердив", 0, 3);

        const titleX = colPos[3];
        const titleY = rowPos[0];
        const titleW = colWidths[3];
        const titleH = rowHeights[0] + rowHeights[1] + rowHeights[2];

        ctx.font = `bold ${mmToPt(6)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText("Схема евакуації", titleX + titleW / 2, titleY + titleH / 2);

        ctx.restore();
    }

    private async _renderPdfPageToOffscreenCanvas(
        objectsToDraw: SceneObject[],
        totalBBox: BoundingBox,
        pageWidth: number,
        pageHeight: number,
    ): Promise<HTMLCanvasElement> {
        const DPI = 150;
        const scaleFactor = DPI / 72;
    
        const canvas = document.createElement('canvas');
        canvas.width = pageWidth * scaleFactor;
        canvas.height = pageHeight * scaleFactor;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not create offscreen canvas context for PDF.');
    
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    
        const mmToPt = (mm: number) => mm / 25.4 * 72;
        const M_LEFT = mmToPt(20) * scaleFactor;
        const M_RIGHT = mmToPt(5) * scaleFactor;
        const M_TOP = mmToPt(5) * scaleFactor;
        const M_BOTTOM = mmToPt(5) * scaleFactor;
    
        ctx.strokeStyle = '#000000';
        ctx.fillStyle = '#000000';
        ctx.lineWidth = 1;
    
        const frameX = M_LEFT;
        const frameY = M_TOP;
        const frameWidth = canvas.width - M_LEFT - M_RIGHT;
        const frameHeight = canvas.height - M_TOP - M_BOTTOM;
        ctx.strokeRect(frameX, frameY, frameWidth, frameHeight);
    
        const stampWidth = mmToPt(185) * scaleFactor;
        const stampHeight = mmToPt(55) * scaleFactor;
        const stampX = canvas.width - M_RIGHT - stampWidth;
        const stampY = canvas.height - M_BOTTOM - stampHeight;
        
        const symbolObjects = objectsToDraw.filter(obj => obj instanceof SymbolObject) as SymbolObject[];
        const uniqueSymbolTypes = [...new Set(symbolObjects.map(obj => obj.symbolType))];
        
        const spaceForLegendBesideStamp = frameWidth - stampWidth - (10 * scaleFactor);
        const canPlaceLegendBeside = spaceForLegendBesideStamp > (60 * scaleFactor);

        let drawingAreaX = frameX;
        let drawingAreaY = frameY;
        let drawingAreaWidth = frameWidth;
        let drawingAreaHeight = frameHeight;
        const PADDING = 10 * scaleFactor;
        
        const drawingContentBBox = { x: 0, y: 0, width: 0, height: 0 };
        const drawingWidth = totalBBox.maxX - totalBBox.minX;
        const drawingHeight = totalBBox.maxY - totalBBox.minY;
        let scale = 1;

        if (canPlaceLegendBeside) {
            drawingAreaHeight = frameHeight - stampHeight - PADDING;
            drawingAreaWidth = frameWidth;
        } else {
            const legendRowCount = uniqueSymbolTypes.length;
            const legendHeight = legendRowCount > 0 ? (30 + legendRowCount * 22) * scaleFactor : 0;
            drawingAreaHeight = frameHeight - stampHeight - legendHeight - PADDING;
            drawingAreaWidth = frameWidth;
        }

        if (drawingWidth > 0 && drawingHeight > 0) {
            const scaleX = (drawingAreaWidth - 2 * PADDING) / drawingWidth;
            const scaleY = (drawingAreaHeight - 2 * PADDING) / drawingHeight;
            scale = Math.min(scaleX, scaleY);
        }

        this.drawTitleBlock(ctx, stampX, stampY, scaleFactor);

        if (uniqueSymbolTypes.length > 0) {
            if (canPlaceLegendBeside) {
                const legendWidth = frameWidth - stampWidth - PADDING;
                const legendHeight = stampHeight;
                const legendX = frameX;
                const legendY = stampY;
                this.drawLegend(ctx, legendX, legendY, legendWidth, legendHeight, uniqueSymbolTypes, symbolObjects, scaleFactor);
            } else {
                const legendRowCount = uniqueSymbolTypes.length;
                const legendHeight = (30 + legendRowCount * 22) * scaleFactor;
                const legendWidth = stampWidth;
                const legendX = stampX;
                const legendY = stampY - legendHeight - PADDING;
                this.drawLegend(ctx, legendX, legendY, legendWidth, legendHeight, uniqueSymbolTypes, symbolObjects, scaleFactor);
            }
        }
        
        drawingContentBBox.x = drawingAreaX + PADDING;
        drawingContentBBox.y = drawingAreaY + PADDING;
        drawingContentBBox.width = drawingAreaWidth - 2 * PADDING;
        drawingContentBBox.height = drawingAreaHeight - 2 * PADDING;
        
        if (drawingWidth <= 0 || drawingHeight <= 0) {
            return canvas;
        }
        
        const scaledDrawingWidth = drawingWidth * scale;
        const scaledDrawingHeight = drawingHeight * scale;
    
        const offsetX = drawingContentBBox.x + (drawingContentBBox.width - scaledDrawingWidth) / 2;
        const offsetY = drawingContentBBox.y + (drawingContentBBox.height - scaledDrawingHeight) / 2;
    
        ctx.save();
        ctx.beginPath();
        ctx.rect(drawingContentBBox.x, drawingContentBBox.y, drawingContentBBox.width, drawingContentBBox.height);
        ctx.clip();
        
        ctx.translate(offsetX, offsetY);
        ctx.scale(scale, scale);
        ctx.translate(-totalBBox.minX, -totalBBox.minY);
    
        const walls = objectsToDraw.filter(o => o instanceof Wall) as Wall[];
        const nonWalls = objectsToDraw.filter(o => !(o instanceof Wall));

        walls.forEach(wall => {
            wall.drawFill(ctx);
        });

        walls.forEach(wall => {
            wall.drawStroke(ctx, false, 1 / scale, objectsToDraw, this.app);
        });
        
        nonWalls.forEach(obj => {
             obj.draw(ctx, false, 1 / scale, objectsToDraw, this.app);
        });
        
        ctx.restore();
    
        return canvas;
    }

    /**
     * Експортує сцену у формат PDF з рамкою, штампом та легендою.
     */
    async exportAsPDF(): Promise<void> {
        const totalBBox = this.app.sceneService.getVisibleObjectsBoundingBox();
        if (!totalBBox) {
            this.app.dialogController.alert("Експорт", "Немає видимих об'єктів для експорту.");
            return;
        }

        this.app.dialogController.showLoading('Експорт у PDF...', 'Створення макету...');
        if (window.electronAPI?.setProgressBar) {
            window.electronAPI.setProgressBar(0.2);
        }

        try {
            const objectsToDraw = this.app.sceneService.getVisibleObjectsSortedForRender();
            const drawingWidth = totalBBox.maxX - totalBBox.minX;
            const drawingHeight = totalBBox.maxY - totalBBox.minY;

            const A4_WIDTH = 595;
            const A4_HEIGHT = 842;
            
            const isLandscape = drawingWidth > drawingHeight;
            const pageWidth = isLandscape ? A4_HEIGHT : A4_WIDTH;
            const pageHeight = isLandscape ? A4_WIDTH : A4_HEIGHT;
            
            const offscreenCanvas = await this._renderPdfPageToOffscreenCanvas(
                objectsToDraw, totalBBox, pageWidth, pageHeight
            );
            
            const imageDataUrl = offscreenCanvas.toDataURL('image/png');
            
            const doc = new jspdf.jsPDF({
                orientation: isLandscape ? 'l' : 'p',
                unit: 'pt',
                format: 'a4'
            });

            if (window.electronAPI?.setProgressBar) {
                window.electronAPI.setProgressBar(0.7);
            }

            doc.addImage(imageDataUrl, 'PNG', 0, 0, pageWidth, pageHeight);
            doc.save('evacuation-plan.pdf');

        } catch (error) {
            console.error("Failed to generate PDF:", error);
            this.app.dialogController.alert("Помилка PDF", "Виникла помилка при створенні PDF-файлу. Перевірте консоль для деталей.");
        } finally {
            this.app.dialogController.hideLoading();
            if (window.electronAPI?.setProgressBar) {
                window.electronAPI.setProgressBar(-1);
            }
        }
    }

    /**
     * Повертає дані зображення для експорту у вигляді Data URL.
     * @param boundingBox Габаритний прямокутник для експорту.
     */
    getExportImageData(boundingBox: BoundingBox): { dataUrl: string, width: number, height: number } | null {
        try {
            const offscreenCanvas = this._renderToOffscreenCanvas(boundingBox);
            return {
                dataUrl: offscreenCanvas.toDataURL('image/png'),
                width: offscreenCanvas.width,
                height: offscreenCanvas.height,
            };
        } catch (error: any) {
            console.warn(error.message);
            return null;
        }
    }
}
