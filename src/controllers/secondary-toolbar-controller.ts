/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from '../app';
import { ToolType } from '../tools/tool';
import { WallTool } from '../tools/wall-tool';
import { WallType } from '../scene/wall';

export class SecondaryToolbarController {
    private app: App;

    constructor(app: App) {
        this.app = app;
        this.initListeners();
    }
    
    private initListeners(): void {
        document.querySelectorAll<HTMLElement>('.secondary-toolbar .tool-button').forEach(button => {
            const toolType = this.getToolTypeFromId(button.id);
            if (toolType === null) return;
            
            button.addEventListener('click', () => {
                if (toolType === ToolType.WALL) {
                    const wallType = button.dataset.wallType as WallType;
                    const wallTool = this.app.getTool(ToolType.WALL) as WallTool;
                    wallTool.selectedWallType = wallType;
                }
                const command = this.getCommandFromToolType(toolType);
                if (command) {
                    this.app.startCommand(command);
                } else {
                    this.app.setActiveTool(toolType);
                }
            });
        });

        document.getElementById('pdf-underlay-button')?.addEventListener('click', () => {
            document.getElementById('pdf-loader')?.click();
        });
        document.getElementById('export-png-button')?.addEventListener('click', () => this.app.exportAsPNG());
        document.getElementById('export-pdf-button')?.addEventListener('click', () => this.app.exportAsPDF());
        
        document.getElementById('finish-sketch-button')?.addEventListener('click', () => this.app.exitSketchMode(true));
    }

    private getToolTypeFromId(id: string): ToolType | null {
        switch (id) {
            case 'wall-exterior-tool':
            case 'wall-interior-tool':
            case 'wall-partition-tool': return ToolType.WALL;
            case 'door-tool': return ToolType.DOOR;
            case 'window-tool': return ToolType.WINDOW;
            case 'stairs-tool': return ToolType.STAIRS;
            case 'text-tool': return ToolType.TEXT;
            case 'evacuation-path-tool': return ToolType.EVACUATION_PATH;
            case 'emergency-evacuation-path-tool': return ToolType.EMERGENCY_EVACUATION_PATH;
            case 'polyline-tool': return ToolType.POLYLINE;
            case 'circle-tool': return ToolType.CIRCLE;
            case 'arc-tool': return ToolType.ARC;
            case 'hatch-tool': return ToolType.HATCH;
            case 'sketch-tool': return ToolType.SKETCH;
            case 'dimlinear-tool': return ToolType.DIMLINEAR;
            case 'dimaligned-tool': return ToolType.DIMALIGNED;
            case 'create-block-tool': return ToolType.BLOCK;
            case 'insert-block-tool': return ToolType.INSERT;
            case 'horizontal-constraint-tool': return ToolType.HORIZONTAL_CONSTRAINT;
            case 'vertical-constraint-tool': return ToolType.VERTICAL_CONSTRAINT;
            case 'parallel-constraint-tool': return ToolType.PARALLEL_CONSTRAINT;
            case 'perpendicular-constraint-tool': return ToolType.PERPENDICULAR_CONSTRAINT;
            case 'angle-constraint-tool': return ToolType.ANGLE_CONSTRAINT;
            case 'length-constraint-tool': return ToolType.LENGTH_CONSTRAINT;
            case 'tangent-constraint-tool': return ToolType.TANGENT_CONSTRAINT;
        }
        return null;
    }
    
    private getCommandFromToolType(toolType: ToolType): string | null {
        switch (toolType) {
            case ToolType.POLYLINE: return 'LINE';
            case ToolType.DIMLINEAR: return 'DIMLINEAR';
            case ToolType.DIMALIGNED: return 'DIMALIGNED';
            case ToolType.BLOCK: return 'BLOCK';
            case ToolType.INSERT: return 'INSERT';
        }
        return null;
    }
}
