/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from './app';
import { WallType } from './scene/wall';
import { ToolType } from './tools/tool';
import { WallTool } from './tools/wall-tool';
import { SelectionObserver } from './controllers/interfaces';
import { SceneObject } from './scene/scene-object';

export type ToolbarMapping = {
    toolbar: HTMLElement;
    button: HTMLButtonElement;
};

export class ToolbarManager implements SelectionObserver {
    private app: App;
    public secondaryToolbars: ToolbarMapping[];
    private toolToToolbarMap: Map<ToolType, HTMLElement>;
    private allToolButtons: HTMLButtonElement[];
    
    private scaleRefButton: HTMLButtonElement;
    private rotateRefButton: HTMLButtonElement;

    constructor(app: App) {
        this.app = app;

        const drawingToolbar = document.getElementById('drawing-toolbar')!;
        const modificationToolbar = document.getElementById('modification-toolbar')!;
        const annotationsToolbar = document.getElementById('annotations-toolbar')!;
        const precisionToolbar = document.getElementById('precision-toolbar')!;
        const fileToolbar = document.getElementById('file-toolbar')!;

        this.secondaryToolbars = [
            { toolbar: drawingToolbar, button: document.getElementById('drawing-tools-toggle') as HTMLButtonElement },
            { toolbar: modificationToolbar, button: document.getElementById('modification-tools-toggle') as HTMLButtonElement },
            { toolbar: annotationsToolbar, button: document.getElementById('annotations-tools-toggle') as HTMLButtonElement },
            { toolbar: precisionToolbar, button: document.getElementById('precision-tools-toggle') as HTMLButtonElement },
            { toolbar: fileToolbar, button: document.getElementById('file-tools-toggle') as HTMLButtonElement },
        ];
        
        this.toolToToolbarMap = this.createToolToToolbarMap();
        this.allToolButtons = Array.from(document.querySelectorAll('.tool-button'));
        
        this.scaleRefButton = document.getElementById('scale-ref-tool') as HTMLButtonElement;
        this.rotateRefButton = document.getElementById('rotate-ref-tool') as HTMLButtonElement;
        this.initPrecisionListeners();
    }

    private initPrecisionListeners(): void {
        this.scaleRefButton.addEventListener('click', () => this.app.setActiveTool(ToolType.SCALE_BY_REFERENCE));
        this.rotateRefButton.addEventListener('click', () => this.app.setActiveTool(ToolType.ROTATE_BY_REFERENCE));
        
        document.getElementById('pdf-loader')?.addEventListener('change', (e) => {
            const input = e.target as HTMLInputElement;
            if (input.files && input.files.length > 0) {
                this.app.loadPdfUnderlay(input.files[0]);
                input.value = '';
            }
        });
        
        document.getElementById('toggle-snapping-button')?.addEventListener('click', (e) => {
            this.app.isSnappingEnabled = !this.app.isSnappingEnabled;
            (e.currentTarget as HTMLElement).classList.toggle('active', this.app.isSnappingEnabled);
        });
        document.getElementById('toggle-ortho-button')?.addEventListener('click', (e) => {
            this.app.isOrthoEnabled = !this.app.isOrthoEnabled;
            (e.currentTarget as HTMLElement).classList.toggle('active', this.app.isOrthoEnabled);
        });
        document.getElementById('toggle-object-snapping-button')?.addEventListener('click', (e) => {
            const objectSnapToolbar = document.getElementById('object-snap-toolbar')!;
            const isVisible = objectSnapToolbar.classList.toggle('visible');
            (e.currentTarget as HTMLElement).classList.toggle('active', isVisible);
        });
    }
    
    onSelectionChanged(selectedObjects: SceneObject[]): void {
        const selectedCount = selectedObjects.length;
        this.scaleRefButton.disabled = selectedCount !== 1;
        this.rotateRefButton.disabled = selectedCount !== 1;
    }
    
    private getToolTypeFromId(id: string): ToolType | null {
        const toolMap: { [key: string]: ToolType } = {
            'select-tool': ToolType.SELECT, 'pan-tool': ToolType.PAN,
            'wall-exterior-tool': ToolType.WALL, 'wall-interior-tool': ToolType.WALL, 'wall-partition-tool': ToolType.WALL,
            'door-tool': ToolType.DOOR, 'window-tool': ToolType.WINDOW, 'stairs-tool': ToolType.STAIRS,
            'text-tool': ToolType.TEXT, 'evacuation-path-tool': ToolType.EVACUATION_PATH,
            'emergency-evacuation-path-tool': ToolType.EMERGENCY_EVACUATION_PATH,
            'scale-ref-tool': ToolType.SCALE_BY_REFERENCE, 'rotate-ref-tool': ToolType.ROTATE_BY_REFERENCE,
            'polyline-tool': ToolType.POLYLINE, 'circle-tool': ToolType.CIRCLE, 'arc-tool': ToolType.ARC,
            'hatch-tool': ToolType.HATCH, 'sketch-tool': ToolType.SKETCH,
            'dimlinear-tool': ToolType.DIMLINEAR,
            'dimaligned-tool': ToolType.DIMALIGNED, 'create-block-tool': ToolType.BLOCK, 'insert-block-tool': ToolType.INSERT,
            'horizontal-constraint-tool': ToolType.HORIZONTAL_CONSTRAINT, 'vertical-constraint-tool': ToolType.VERTICAL_CONSTRAINT,
            'parallel-constraint-tool': ToolType.PARALLEL_CONSTRAINT, 'perpendicular-constraint-tool': ToolType.PERPENDICULAR_CONSTRAINT,
            'angle-constraint-tool': ToolType.ANGLE_CONSTRAINT, 'length-constraint-tool': ToolType.LENGTH_CONSTRAINT,
            'tangent-constraint-tool': ToolType.TANGENT_CONSTRAINT,
        };
        return toolMap[id] || null;
    }

    private createToolToToolbarMap(): Map<ToolType, HTMLElement> {
        const map = new Map<ToolType, HTMLElement>();
        this.secondaryToolbars.forEach(mapping => {
            const toolButtons = mapping.toolbar.querySelectorAll<HTMLButtonElement>('[id$="-tool"]');
            toolButtons.forEach(button => {
                const toolType = this.getToolTypeFromId(button.id);
                if (toolType !== null) {
                    map.set(toolType, mapping.toolbar);
                }
            });
        });
        return map;
    }

    public toggleToolbar(toolbarToShow: HTMLElement): void {
        const isAlreadyVisible = toolbarToShow.classList.contains('visible');
        const correspondingButton = this.secondaryToolbars.find(m => m.toolbar === toolbarToShow)?.button;

        this.secondaryToolbars.forEach(mapping => {
            mapping.toolbar.classList.remove('visible');
            mapping.button.classList.remove('active');
        });

        if (!isAlreadyVisible && correspondingButton) {
            toolbarToShow.classList.add('visible');
            correspondingButton.classList.add('active');
        }
    }

    public setActiveToolButton(toolType: ToolType): void {
        const activeToolbar = this.toolToToolbarMap.get(toolType);
        if (activeToolbar) {
            this.toggleToolbar(activeToolbar);
        } else {
            this.secondaryToolbars.forEach(mapping => {
                mapping.toolbar.classList.remove('visible');
                mapping.button.classList.remove('active');
            });
        }
        
        let buttonIdToActivate: string | null = null;
        if (toolType === ToolType.WALL) {
            const wallTool = this.app.getTool(ToolType.WALL) as WallTool;
            const type = wallTool.selectedWallType;
            if (type === WallType.EXTERIOR) buttonIdToActivate = 'wall-exterior-tool';
            else if (type === WallType.INTERIOR) buttonIdToActivate = 'wall-interior-tool';
            else buttonIdToActivate = 'wall-partition-tool';
        } else {
            for (const button of this.allToolButtons) {
                if (this.getToolTypeFromId(button.id) === toolType) {
                    buttonIdToActivate = button.id;
                    break;
                }
            }
        }
        
        this.allToolButtons.forEach((button) => {
            const isActive = button.id === buttonIdToActivate;
            button.classList.toggle('active', isActive);
        });

        document.getElementById('stairs-tool-options')!.classList.toggle('visible', toolType === ToolType.STAIRS);
    }

    public updateFor3DMode(is3dActive: boolean): void {
        document.getElementById('toggle-3d-view')?.classList.toggle('active', is3dActive);
        
        if (is3dActive) {
            this.secondaryToolbars.forEach(mapping => {
                if (mapping.toolbar.id !== 'modification-toolbar') {
                    mapping.toolbar.classList.remove('visible');
                    mapping.button.classList.remove('active');
                } else {
                    mapping.toolbar.classList.add('visible');
                    mapping.button.classList.add('active');
                }
            });
        }
    }
    
    public showSketchModeUI(show: boolean): void {
        document.body.classList.toggle('sketch-mode-active', show);
    }
}
