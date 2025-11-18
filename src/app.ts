/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// FIX: Change import from ToolbarController to ToolbarManager and adjust usage.
import { CanvasController } from './canvas-controller';
import { InputHandler } from './input-handler';
import { ToolbarManager } from './toolbar-controller';
import { SceneObject } from './scene/scene-object';
import { Tool, ToolType } from './tools/tool';
import { SelectTool } from './tools/select-tool';
import { PanTool } from './tools/pan-tool';
import { WallTool } from './tools/wall-tool';
import { DoorTool } from './tools/door-tool';
import { WindowTool } from './tools/window-tool';
import { TextTool } from './tools/text-tool';
import { SymbolPaletteController } from './symbol-palette-controller';
import { PropertiesController } from './properties-controller';
import { InlineTextEditor } from './inline-text-editor';
import { TextObject } from './scene/text-object';
import { Wall, WallType } from './scene/wall';
import { TooltipController } from './tooltip-controller';
import { StairsToolOptionsController } from './stairs-tool-options-controller';
import { LayersController } from './layers-controller';
import { WindowManager } from './window-manager';
import { StairsTool } from './tools/stairs-tool';
import { StairsObject, StairsType } from './scene/stairs-object';
import { ScaleTool } from './tools/scale-tool';
import { RotateTool } from './tools/rotate-tool';
import { DialogController } from './dialog-controller';
import { CoordinateInputController } from './coordinate-input-controller';
import { StatusBarController } from './status-bar-controller';
import { GeminiService } from './services/gemini-service';
import { GroupObject } from './scene/group-object';
import { SketchObject } from './scene/sketch-object';
import { PolylineTool } from './tools/polyline-tool';
import { CircleTool } from './tools/circle-tool';
import { ArcTool } from './tools/arc-tool';
import { HatchTool } from './tools/hatch-tool';
import { PolylineObject } from './scene/polyline-object';
import { CircleObject } from './scene/circle-object';
import { ArcObject } from './scene/arc-object';
import { HatchObject, HatchPattern } from './scene/hatch-object';
import { SnapType } from './snapping';
import { ObjectSnapController } from './object-snap-controller';
import { GripContextMenuController } from './grip-context-menu-controller';
import { CommandManager } from './command-manager';
import { CommandLineController } from './command-line-controller';
import { EmergencyEvacuationPathTool } from './tools/emergency-evacuation-path-tool';
import { I18nService } from './i18n';
import { WorkspaceManager } from './workspace-manager';
import { GeometryService } from './services/geometry-service';
import { StyleManager } from './style-manager';
import { StyleManagerController } from './style-manager-controller';
import { DimensionStyleManagerController } from './dimension-style-manager-controller';
import { HorizontalConstraintTool } from './tools/horizontal-constraint-tool';
import { VerticalConstraintTool } from './tools/vertical-constraint-tool';
import { ConstraintSolver } from './sketcher/constraint-solver';
import { SketchTool } from './tools/sketch-tool';
import { ParallelConstraintTool } from './tools/parallel-constraint-tool';
import { PerpendicularConstraintTool } from './tools/perpendicular-constraint-tool';
import { AngleConstraintTool } from './tools/angle-constraint-tool';
import { LengthConstraintTool } from './tools/length-constraint-tool';
import { TangentConstraintTool } from './tools/tangent-constraint-tool';
import { ThreeDController } from './three-d-controller';
import { SceneService } from './services/scene.service';
import { LayerService } from './services/layer.service';
import { SelectionService } from './services/selection.service';
import { ProjectStateService } from './services/project-state.service';
import { EvacuationPathTool } from './tools/evacuation-path-tool';
import { ModificationToolbarController } from './controllers/modification-toolbar-controller';
import { PrimaryToolbarController } from './controllers/primary-toolbar-controller';
import { SecondaryToolbarController } from './controllers/secondary-toolbar-controller';
import { LogViewerController } from './log-viewer-controller';
// FIX: Import `objectFactory` to resolve usage error.
import { objectFactory } from './scene/factory';
// FIX: Import `TextStyle` for use in new style management methods.
import { TextStyle } from './styles/text-style';
import { DxfImportService } from './services/dxf-import-service';
import { DxfExportService } from './services/dxf-export-service';
import { StlExportService } from './services/stl-export-service';
import { FileValidationService } from './services/file-validation-service';

declare const pdfjsLib: any;

declare global {
    interface Window {
      electronAPI?: {
        onMenuAction: (callback: (action: string, payload?: any) => void) => void;
        updateMenuState: (key: string, value: boolean) => void;
        onSetLanguage: (callback: (lang: string) => void) => void;
        requestInitialLanguage: () => void;
        languageChanged: (lang: string) => void;
        showAlert: (options: { title: string; message: string; }) => Promise<any>;
        showPrompt: (options: { title: string; message: string; defaultValue: string; }) => Promise<{ canceled: boolean; value: string | null; }>;
        setProgressBar: (progress: number) => void;
        showNotification: (options: { title: string; body: string; }) => void;
        readFile: (path: string) => Promise<string>;
        saveFile: (options: { defaultPath: string; content: string; }) => Promise<{ canceled: boolean; path?: string }>;
      }
    }
}

export class App {
    // --- Core Controllers ---
    public canvasController: CanvasController;
    public threeDController: ThreeDController;
    public inputHandler: InputHandler;
    public commandManager: CommandManager;

    // --- Services ---
    public sceneService: SceneService;
    public layerService: LayerService;
    public selectionService: SelectionService;
    public projectStateService: ProjectStateService;
    public geminiService: GeminiService;
    public geometryService: GeometryService;
    public i18n: I18nService;
    
    // --- UI Controllers ---
    public toolbarController: ToolbarManager;
    public primaryToolbarController: PrimaryToolbarController;
    public modificationToolbarController: ModificationToolbarController;
    public secondaryToolbarController: SecondaryToolbarController;
    public symbolPaletteController: SymbolPaletteController;
    public propertiesController: PropertiesController;
    public inlineTextEditor: InlineTextEditor;
    public tooltipController: TooltipController;
    public stairsToolOptionsController: StairsToolOptionsController;
    public layersController: LayersController;
    public styleManagerController: StyleManagerController;
    public dimensionStyleManagerController: DimensionStyleManagerController;
    public windowManager: WindowManager;
    public dialogController: DialogController;
    public coordinateInputController: CoordinateInputController;
    public statusBarController: StatusBarController;
    public commandLineController: CommandLineController;
    public objectSnapController: ObjectSnapController;
    public gripContextMenuController: GripContextMenuController;
    public workspaceManager: WorkspaceManager;
    public logViewerController: LogViewerController;

    // --- State ---
    public isSketchMode: boolean = false;
    public sketchContext: SceneObject[] = [];
    public sketchSolver: ConstraintSolver | null = null;
    public groupEditContext: GroupObject | null = null;
    public is3dViewActive: boolean = false;
    public styleManager: StyleManager;
    public isSnappingEnabled = true;
    public isOrthoEnabled = false;
    public snapModes: Map<SnapType, boolean>;
    
    // --- Tools ---
    private tools: Map<ToolType, Tool>;
    public activeTool!: Tool;
    
    private workspaceSelectionModal: HTMLElement;
    private hasInitialized: boolean = false;

    constructor(canvas: HTMLCanvasElement) {
        this.workspaceSelectionModal = document.getElementById('workspace-selection-modal')!;

        // --- Initialize Services (order matters) ---
        this.i18n = new I18nService();
        this.styleManager = new StyleManager();
        this.sceneService = new SceneService(this);
        this.layerService = new LayerService(this);
        this.selectionService = new SelectionService(this);
        this.projectStateService = new ProjectStateService(this);
        this.geminiService = new GeminiService();
        this.geometryService = new GeometryService();

        // --- Initialize Core Controllers ---
        this.commandManager = new CommandManager(this);
        this.canvasController = new CanvasController(canvas, this);
        const canvas3d = document.getElementById('3d-canvas') as HTMLCanvasElement;
        this.threeDController = new ThreeDController(canvas3d, this);
        this.inputHandler = new InputHandler(this);
        
        // --- Initialize UI Controllers ---
        this.windowManager = new WindowManager();
        this.dialogController = new DialogController(this.i18n);
        this.propertiesController = new PropertiesController(this);
        this.tooltipController = new TooltipController();
        this.layersController = new LayersController(this);
        this.styleManagerController = new StyleManagerController(this);
        this.dimensionStyleManagerController = new DimensionStyleManagerController(this);
        this.stairsToolOptionsController = new StairsToolOptionsController(this);
        this.coordinateInputController = new CoordinateInputController(this);
        this.statusBarController = new StatusBarController();
        this.commandLineController = new CommandLineController(this);
        this.objectSnapController = new ObjectSnapController(this);
        this.gripContextMenuController = new GripContextMenuController(this);
        this.workspaceManager = new WorkspaceManager(this);
        this.symbolPaletteController = new SymbolPaletteController(this);
        this.inlineTextEditor = new InlineTextEditor(this);
        this.logViewerController = new LogViewerController(this);

        // --- Initialize Toolbar Controllers ---
        this.toolbarController = new ToolbarManager(this);
        this.primaryToolbarController = new PrimaryToolbarController(this, this.toolbarController);
        this.modificationToolbarController = new ModificationToolbarController(this);
        this.secondaryToolbarController = new SecondaryToolbarController(this);

        // --- Initialize Snap Modes & Tools ---
        this.snapModes = new Map([
            [SnapType.ENDPOINT, true], [SnapType.MIDPOINT, true], [SnapType.CENTER, true],
            [SnapType.INTERSECTION, true], [SnapType.PERPENDICULAR, true], [SnapType.QUADRANT, true],
            [SnapType.TANGENT, true], [SnapType.NEAREST, true],
        ]);
        this.tools = this.createTools();

        // --- Connect Observers ---
        this.selectionService.subscribe(this.propertiesController);
        this.selectionService.subscribe(this.modificationToolbarController);
        this.selectionService.subscribe(this.toolbarController);
        this.projectStateService.subscribe(this.primaryToolbarController);

        // --- Final Setup ---
        this.setupElectronListeners();
        this.objectSnapController.syncButtonsToState();
        
        if (window.electronAPI) {
            window.electronAPI.requestInitialLanguage();
        } else {
            this.i18n.init().then(() => {
                this.setupWorkspaceSelectionListeners();
            });
        }
    }
    
    private createTools(): Map<ToolType, Tool> {
        return new Map([
            [ToolType.SELECT, new SelectTool(this)], [ToolType.PAN, new PanTool(this)],
            [ToolType.WALL, new WallTool(this)], [ToolType.DOOR, new DoorTool(this)],
            [ToolType.WINDOW, new WindowTool(this)], [ToolType.STAIRS, new StairsTool(this)],
            [ToolType.TEXT, new TextTool(this)], [ToolType.EVACUATION_PATH, new EvacuationPathTool(this)],
            [ToolType.EMERGENCY_EVACUATION_PATH, new EmergencyEvacuationPathTool(this)],
            [ToolType.SCALE_BY_REFERENCE, new ScaleTool(this)], [ToolType.ROTATE_BY_REFERENCE, new RotateTool(this)],
            [ToolType.POLYLINE, new PolylineTool(this)], [ToolType.CIRCLE, new CircleTool(this)],
            [ToolType.ARC, new ArcTool(this)], [ToolType.HATCH, new HatchTool(this)],
            [ToolType.SKETCH, new SketchTool(this)],
            [ToolType.HORIZONTAL_CONSTRAINT, new HorizontalConstraintTool(this)],
            [ToolType.VERTICAL_CONSTRAINT, new VerticalConstraintTool(this)],
            [ToolType.PARALLEL_CONSTRAINT, new ParallelConstraintTool(this)],
            [ToolType.PERPENDICULAR_CONSTRAINT, new PerpendicularConstraintTool(this)],
            [ToolType.ANGLE_CONSTRAINT, new AngleConstraintTool(this)],
            [ToolType.LENGTH_CONSTRAINT, new LengthConstraintTool(this)],
            [ToolType.TANGENT_CONSTRAINT, new TangentConstraintTool(this)],
        ]);
    }
    
    private setupWorkspaceSelectionListeners(): void {
        const evacuationButton = document.getElementById('workspace-evacuation')!;
        const classicButton = document.getElementById('workspace-classic')!;

        evacuationButton.addEventListener('click', () => this.initializeWorkspace('evacuation'));
        classicButton.addEventListener('click', () => this.initializeWorkspace('classic'));
    }

    private initializeWorkspace(workspace: 'evacuation' | 'classic'): void {
        if (this.hasInitialized) return;
        this.hasInitialized = true;

        this.workspaceSelectionModal.classList.add('hidden');

        this.newProject(); // Creates default layers and sets up initial state
        
        this.activeTool = this.tools.get(ToolType.SELECT)!;
        this.toolbarController.setActiveToolButton(ToolType.SELECT);

        this.inputHandler.init();
        
        // Configure UI based on the chosen workspace
        this.workspaceManager.switchTo(workspace);
    }
    
    private setupElectronListeners(): void {
        if (window.electronAPI) {
            window.electronAPI.onSetLanguage(async (lang) => {
                await this.i18n.setLanguage(lang);
                if (!this.hasInitialized) {
                    this.setupWorkspaceSelectionListeners();
                }
            });
            
            window.electronAPI.onMenuAction((action, payload) => {
                if (!this.hasInitialized) return;
                switch (action) {
                    case 'new-project': this.newProject(); break;
                    case 'export-png': this.exportAsPNG(); break;
                    case 'export-pdf': this.exportAsPDF(); break;
                    case 'export-dxf': this.exportAsDXF(); break;
                    case 'export-stl': this.exportAsSTL(); break;
                    case 'import-dxf': this.importDXF(payload); break;
                    case 'undo': this.projectStateService.undo(); break;
                    case 'redo': this.projectStateService.redo(); break;
                    case 'copy': this.projectStateService.copySelection(); break;
                    case 'paste': this.projectStateService.pasteFromClipboard(); break;
                    case 'delete': this.sceneService.deleteSelected(); break;
                    case 'group': this.groupSelectedObjects(); break;
                    case 'ungroup': this.ungroupSelectedObjects(); break;
                    case 'toggle-layers': this.toggleLayersWindow(); break;
                    case 'toggle-properties': this.togglePropertiesWindow(); break;
                }
            });
        }
    }
    
    public newProject(): void {
        this.sceneService.clear();
        this.layerService.clear();
        this.styleManager = new StyleManager();
        this.projectStateService.blockDefinitions.clear();
        this.groupEditContext = null;
        
        this.layerService.addLayer(this.i18n.t('layer.underlay'), false);
        this.layerService.addLayer(this.i18n.t('layer.walls'), false);
        this.layerService.addLayer(this.i18n.t('layer.symbols'), false);
        this.layerService.addLayer(this.i18n.t('layer.paths'), false);
        const wallsLayer = this.layerService.layers.find(l => l.name === this.i18n.t('layer.walls'));
        if (wallsLayer) {
            this.layerService.setActiveLayerId(wallsLayer.id, false);
        }

        this.projectStateService.clearHistory();
        this.projectStateService.commit("New Project");
        this.selectionService.set([]);
        this.styleManagerController.render();
        this.dimensionStyleManagerController.render();
    }
    
    startCommand(commandName: string): void {
        const preSelectedObjects = this.sceneService.objects.filter(obj => this.selectionService.selectedIds.includes(obj.id));
        this.commandManager.startCommandByName(commandName, preSelectedObjects);
    }

    commandFinished(): void {
        this.setActiveTool(ToolType.SELECT);
        this.commandLineController.showDefaultPrompt();
    }
    
    get selectedObjectIds(): readonly number[] {
        return this.selectionService.selectedIds;
    }
    
    setSelectedObjectIds(ids: number[]): void {
        this.selectionService.set(ids);
    }
    
    setSelectedObjectId(id: number | null): void {
        this.selectionService.setSingle(id);
    }
    
    setActiveTool(toolType: ToolType): void {
        this.commandManager.cancelCommand();
        this.activeTool?.deactivate();
        const newTool = this.tools.get(toolType);
        if (newTool) {
            this.activeTool = newTool;
            this.activeTool.activate();
            this.toolbarController.setActiveToolButton(toolType);
            this.commandLineController.showDefaultPrompt();
        }
    }
    
    getTool(toolType: ToolType): Tool | undefined {
        return this.tools.get(toolType);
    }
    
    addSceneObject(obj: SceneObject, recordHistory: boolean = true): void {
        if (this.groupEditContext) {
            this.groupEditContext.add(obj);
            if (recordHistory) { this.projectStateService.commit(`Add object to group`); }
            this.draw();
            return;
        }

        if (this.isSketchMode && this.sketchSolver) {
            this.sketchContext.push(obj);
            if (obj instanceof PolylineObject) {
                obj.points.forEach(p => this.sketchSolver!.addPoint(p));
            } else if (obj instanceof CircleObject || obj instanceof ArcObject) {
                this.sketchSolver.addPoint(obj.center);
            }
            this.draw();
            return;
        }

        const targetLayerName = this.layerService.getLayerNameForObject(obj);
        if (targetLayerName) {
            const targetLayer = this.layerService.layers.find(l => l.name === targetLayerName);
            if (targetLayer && this.layerService.activeLayerId !== targetLayer.id) {
                this.layerService.setActiveLayerId(targetLayer.id, false);
            }
        }

        const activeLayer = this.layerService.layers.find(l => l.id === this.layerService.activeLayerId);
        if (!activeLayer) { console.error("Cannot add object: No active layer found."); return; }

        if (activeLayer.isLocked) {
            this.dialogController.alert(this.i18n.t('dialog.error'), this.i18n.t('dialog.cantAddToLockedLayer'));
            return;
        }

        this.sceneService.add(obj);
        activeLayer.objectIds.push(obj.id);
        
        if (recordHistory) { this.projectStateService.commit(`Add object ${obj.constructor.name}`); }
        this.draw();
    }
    
    public updateSelectedObjectsProperty(key: string, value: any, recordHistory: boolean = true) {
        if (this.selectionService.selectedIds.length === 0) return;
        const objects = this.groupEditContext ? this.groupEditContext.objects : this.sceneService.objects;
        const selectedObjects = objects.filter(obj => this.selectionService.selectedIds.includes(obj.id));

        let changed = false;
        selectedObjects.forEach(obj => {
            const layer = this.layerService.getLayerForObject(obj.id);
            if (layer?.isLocked) return;

            if (key in obj) {
                if (key === 'type' && obj instanceof Wall) obj.setType(value as WallType);
                else if (key === 'stairsType' && obj instanceof StairsObject) obj.stairsType = value as StairsType;
                else if (key === 'pattern' && obj instanceof HatchObject) obj.pattern = value as HatchPattern;
                else (obj as any)[key] = value;
                changed = true;
            }
        });
        
        if (changed) {
            if (recordHistory) {
                this.projectStateService.commit(`Update property ${key}`);
                this.propertiesController.onSelectionChanged(selectedObjects);
            }
            this.draw();
        }
    }
    
    deleteSelectedObjects(): void {
        this.sceneService.deleteSelected();
    }
    
    startTextEditing(textObject: TextObject): void {
        const layer = this.layerService.getLayerForObject(textObject.id);
        if (layer?.isLocked) return;
        if (this.activeTool.type !== ToolType.SELECT) { this.setActiveTool(ToolType.SELECT); }
        this.setSelectedObjectId(textObject.id);
        this.inlineTextEditor.startEditing(textObject);
    }
    
    async loadPdfUnderlay(file: File) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 1.5 });
            const offscreenCanvas = document.createElement('canvas');
            const context = offscreenCanvas.getContext('2d');
            offscreenCanvas.width = viewport.width;
            offscreenCanvas.height = viewport.height;
            if (!context) throw new Error("Could not create canvas context for PDF rendering.");
            await page.render({ canvasContext: context, viewport: viewport }).promise;
            const dataUrl = offscreenCanvas.toDataURL();
            const image = new Image();
            image.onload = () => {
                const center = this.canvasController.screenToWorld({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
                const underlay = new (objectFactory.pdfUnderlay as any)(this.sceneService.getNextId(), center.x, center.y, image.width, image.height, image);
                this.addSceneObject(underlay);
                this.setSelectedObjectId(underlay.id);
            };
            image.src = dataUrl;
        } catch (error) {
            console.error("Error loading or rendering PDF:", error);
            await this.dialogController.alert(this.i18n.t('dialog.errorPdf'), this.i18n.t('dialog.errorPdfMessage'));
        }
    }
    
    exportAsPNG(): void {
        const totalBBox = this.sceneService.getVisibleObjectsBoundingBox();
        if (!totalBBox) {
            this.dialogController.alert(this.i18n.t('dialog.export.noObjects'), this.i18n.t('dialog.export.noObjectsMessage'));
            return;
        }
        this.canvasController.exportAsPNG(totalBBox);
    }

    exportAsPDF(): void { this.canvasController.exportAsPDF(); }

    private async exportWithSave(content: string, defaultName: string, fileType: string): Promise<void> {
        if (window.electronAPI && window.electronAPI.saveFile) {
            try {
                const result = await window.electronAPI.saveFile({
                    defaultPath: defaultName,
                    content: content
                });
                if (!result.canceled && result.path) {
                    this.dialogController.alert(this.i18n.t('dialog.success'), `${fileType} збережено як ${result.path}`);
                }
            } catch (error) {
                console.error('Помилка збереження файлу:', error);
                this.dialogController.alert(this.i18n.t('dialog.error'), this.i18n.t('dialog.saveError'));
            }
        } else {
            // Fallback для веб: завантаження через браузер
            const blob = new Blob([content], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = defaultName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            this.showNotification({ title: this.i18n.t('dialog.success'), body: `${fileType} завантажено` });
        }
    }

    private async importWithValidation(filePath: string, validateFn: (content: string) => { isValid: boolean; errors: string[] }, importFn: (content: string) => Promise<any[]>): Promise<void> {
        if (!window.electronAPI || !window.electronAPI.readFile) {
            this.dialogController.alert(this.i18n.t('dialog.error'), this.i18n.t('dialog.electronRequired'));
            return;
        }

        try {
            const content = await window.electronAPI.readFile(filePath);
            const validation = validateFn(content);
            if (!validation.isValid) {
                this.dialogController.alert(this.i18n.t('dialog.validationError'), validation.errors.join('\n'));
                return;
            }

            const objects = await importFn(content);
            objects.forEach(obj => this.addSceneObject(obj));
            this.projectStateService.commit(`Імпорт ${objects.length} об'єктів`);
            this.showNotification({ title: this.i18n.t('dialog.success'), body: `Імпортовано ${objects.length} об'єктів` });
        } catch (error) {
            console.error('Помилка імпорту:', error);
            this.dialogController.alert(this.i18n.t('dialog.error'), this.i18n.t('dialog.importError'));
        }
    }

    exportAsDXF(): void {
        const objects = [...this.sceneService.objects];
        const dxfContent = DxfExportService.exportDxf(objects);
        this.exportWithSave(dxfContent, 'export.dxf', 'DXF');
    }

    exportAsSTL(): void {
        const objects = [...this.sceneService.objects];
        const stlContent = StlExportService.exportStl(objects, this);
        this.exportWithSave(stlContent, 'export.stl', 'STL');
    }

    async importDXF(filePath: string): Promise<void> {
        this.importWithValidation(
            filePath,
            FileValidationService.validateDxf,
            DxfImportService.importDxf
        );
    }

    duplicateSelection(): void {
        if (this.selectionService.selectedIds.length === 0) return;
        const objects = this.groupEditContext ? this.groupEditContext.objects : this.sceneService.objects;
        const selectedObjects = objects.filter(obj => this.selectionService.selectedIds.includes(obj.id));
        const newIds: number[] = [];
        if (selectedObjects.length > 0) {
            selectedObjects.forEach(obj => {
                const newObject = obj.clone(this.sceneService.getNextId(), this);
                newObject.move(20, 20, this);
                this.addSceneObject(newObject, false);
                newIds.push(newObject.id);
            });
            this.projectStateService.commit(`Duplicate ${newIds.length} object(s)`);
            this.setSelectedObjectIds(newIds);
        }
    }
    
    groupSelectedObjects(): void {
        if (this.selectionService.selectedIds.length < 2) return;
        const objectsToGroup = this.sceneService.objects.filter(obj => this.selectionService.selectedIds.includes(obj.id));
        objectsToGroup.forEach(obj => {
            this.sceneService.removeById(obj.id);
            this.layerService.removeObjectFromLayers(obj.id);
        });
        const group = new GroupObject(this.sceneService.getNextId(), objectsToGroup);
        this.addSceneObject(group);
        this.setSelectedObjectId(group.id);
        this.projectStateService.commit("Group objects");
    }

    ungroupSelectedObjects(): void {
        if (this.selectionService.selectedIds.length === 0) return;
        const groupsToUngroup = this.sceneService.objects.filter(obj => this.selectionService.selectedIds.includes(obj.id) && obj instanceof GroupObject) as GroupObject[];
        if (groupsToUngroup.length === 0) return;
        
        const newSelectionIds: number[] = [];
        groupsToUngroup.forEach(group => {
            this.sceneService.removeById(group.id);
            this.layerService.removeObjectFromLayers(group.id);
            group.objects.forEach(child => {
                this.addSceneObject(child, false);
                newSelectionIds.push(child.id);
            });
        });
        this.setSelectedObjectIds(newSelectionIds);
        this.projectStateService.commit("Ungroup object(s)");
    }
    
    enterGroupEdit(group: GroupObject): void {
        this.groupEditContext = group;
        this.setSelectedObjectIds([]);
        this.draw();
    }

    exitGroupEdit(): void {
        if (!this.groupEditContext) return;
        const groupId = this.groupEditContext.id;
        this.groupEditContext = null;
        this.setSelectedObjectId(groupId);
        this.draw();
    }
    
    public enterSketchMode(): void {
        if (this.isSketchMode) return;
        this.isSketchMode = true;
        this.sketchContext = [];
        this.sketchSolver = new ConstraintSolver();
        this.toolbarController.showSketchModeUI(true);
        this.setActiveTool(ToolType.POLYLINE);
        this.draw();
    }

    public exitSketchMode(save: boolean): void {
        if (!this.isSketchMode) return;
        this.isSketchMode = false; 

        if (save && this.sketchContext.length > 0) {
            const sketch = new SketchObject(this.sceneService.getNextId(), this.sketchContext, this);
            this.addSceneObject(sketch, false);
            this.setSelectedObjectId(sketch.id);
        }
        
        this.sketchContext = [];
        this.sketchSolver = null;
        this.toolbarController.showSketchModeUI(false);
        this.setActiveTool(ToolType.SELECT);
        this.projectStateService.commit(save ? "Finish Sketch" : "Cancel Sketch");
        this.draw();
    }
    
    // FIX: Implement missing methods called by StyleManagerController
    public async promptForNewTextStyle(): Promise<void> {
        const defaultName = `Style-${this.styleManager.getAllTextStyleNames().length + 1}`;
        const finalName = await this.dialogController.prompt(
            this.i18n.t('styleManager.dialog.new.title'),
            this.i18n.t('styleManager.dialog.new.message'),
            defaultName
        );
        if (finalName && finalName.trim()) {
            const newStyle = new TextStyle(finalName.trim());
            this.styleManager.addTextStyle(newStyle);
            this.projectStateService.commit(`Create text style "${newStyle.name}"`);
            this.styleManagerController.render();
        }
    }

    private showNotification(options: { title: string; body: string }): void {
        if (window.electronAPI && window.electronAPI.showNotification) {
            window.electronAPI.showNotification(options);
        } else {
            console.log(`${options.title}: ${options.body}`);
        }
    }



    public deleteTextStyle(name: string): void {
        if (this.styleManager.deleteTextStyle(name)) {
            this.projectStateService.commit(`Delete text style "${name}"`);
            this.styleManagerController.render();
        } else {
            this.dialogController.alert(this.i18n.t('dialog.error'), this.i18n.t('styleManager.dialog.deleteReadonlyError'));
        }
    }
    
    public toggleLayersWindow(): void { this.windowManager.toggleWindow('layers-window'); }
    public togglePropertiesWindow(): void { this.windowManager.toggleWindow('properties-window'); }
    public toggleStyleManagerWindow(): void { this.windowManager.toggleWindow('style-manager-window'); }
    public toggleDimensionStyleManagerWindow(): void { this.windowManager.toggleWindow('dimension-style-manager-window'); }
    public toggleLogViewerWindow(): void { this.windowManager.toggleWindow('log-viewer-window'); }

    public toggle3dView(forceState?: boolean): void {
        const newState = forceState !== undefined ? forceState : !this.is3dViewActive;
        if (this.is3dViewActive === newState) return;
  
        this.is3dViewActive = newState;
        document.body.classList.toggle('mode-3d', this.is3dViewActive);
  
        if (this.is3dViewActive) {
            this.threeDController.syncScene();
            this.threeDController.activate();
        } else {
            this.threeDController.deactivate();
        }
        
        this.toolbarController.updateFor3DMode(this.is3dViewActive);
    }
    
    draw(): void { this.canvasController.draw(); }
}
