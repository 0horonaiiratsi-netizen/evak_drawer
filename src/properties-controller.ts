/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from './app';
import { SceneObject } from './scene/scene-object';
import { Wall, WallType } from './scene/wall';
import { SymbolObject } from './scene/symbol-object';
import { TextObject } from './scene/text-object';
import { PdfUnderlay } from './scene/pdf-underlay';
import { EvacuationPath } from './scene/evacuation-path';
import { StairsObject, StairsType } from './scene/stairs-object';
import { GroupObject } from './scene/group-object';
import { PolylineObject } from './scene/polyline-object';
import { CircleObject } from './scene/circle-object';
import { ArcObject } from './scene/arc-object';
import { HatchObject, HatchPattern } from './scene/hatch-object';
import { EmergencyEvacuationPath } from './scene/emergency-evacuation-path';
import { I18nService } from './i18n';
import { DimensionObject } from './scene/dimension-object';
// FIX: Import SelectionObserver to implement the interface.
import { SelectionObserver } from './controllers/interfaces';

// FIX: Implement the SelectionObserver interface.
export class PropertiesController implements SelectionObserver {
    private app: App;
    private i18n: I18nService;
    private panel: HTMLElement;
    private inputs: { [key: string]: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement };
    private deleteButton: HTMLElement;
    private multipleSelectionInfo: HTMLElement;
    private multipleSelectionText: HTMLElement;
    private selectSameLayerButton: HTMLButtonElement;


    constructor(app: App) {
        this.app = app;
        this.i18n = app.i18n;
        this.panel = document.getElementById('properties-panel')!;
        this.multipleSelectionInfo = document.getElementById('multiple-selection-info')!;
        this.multipleSelectionText = document.getElementById('multiple-selection-text')!;
        this.selectSameLayerButton = document.getElementById('select-same-layer-button') as HTMLButtonElement;

        this.inputs = {
            objectX: document.getElementById('object-x') as HTMLInputElement,
            objectY: document.getElementById('object-y') as HTMLInputElement,
            objectWidth: document.getElementById('object-width') as HTMLInputElement,
            objectHeight: document.getElementById('object-height') as HTMLInputElement,
            wallP1x: document.getElementById('wall-p1x') as HTMLInputElement,
            wallP1y: document.getElementById('wall-p1y') as HTMLInputElement,
            wallP2x: document.getElementById('wall-p2x') as HTMLInputElement,
            wallP2y: document.getElementById('wall-p2y') as HTMLInputElement,
            wallLength: document.getElementById('wall-length') as HTMLInputElement,
            pathLength: document.getElementById('path-length') as HTMLInputElement,
            pathVertices: document.getElementById('path-vertices') as HTMLInputElement,
            polylineLength: document.getElementById('polyline-length') as HTMLInputElement,
            polylineVertices: document.getElementById('polyline-vertices') as HTMLInputElement,
            polylineClosed: document.getElementById('polyline-closed') as HTMLInputElement,
            circleCx: document.getElementById('circle-cx') as HTMLInputElement,
            circleCy: document.getElementById('circle-cy') as HTMLInputElement,
            circleRadius: document.getElementById('circle-radius') as HTMLInputElement,
            arcCx: document.getElementById('arc-cx') as HTMLInputElement,
            arcCy: document.getElementById('arc-cy') as HTMLInputElement,
            arcRadius: document.getElementById('arc-radius') as HTMLInputElement,
            arcStartAngle: document.getElementById('arc-start-angle') as HTMLInputElement,
            arcEndAngle: document.getElementById('arc-end-angle') as HTMLInputElement,
            objectAngle: document.getElementById('object-angle') as HTMLInputElement,
            genericColor: document.getElementById('generic-color') as HTMLInputElement,
            genericLinewidth: document.getElementById('generic-linewidth') as HTMLInputElement,
            hatchPattern: document.getElementById('hatch-pattern') as HTMLSelectElement,
            hatchScale: document.getElementById('hatch-scale') as HTMLInputElement,
            hatchAngle: document.getElementById('hatch-angle') as HTMLInputElement,
            hatchColor: document.getElementById('hatch-color') as HTMLInputElement,
            wallType: document.getElementById('wall-type') as HTMLSelectElement,
            wallThickness: document.getElementById('wall-thickness') as HTMLInputElement,
            wallColor: document.getElementById('wall-color') as HTMLInputElement,
            symbolColor: document.getElementById('symbol-color') as HTMLInputElement,
            stairsType: document.getElementById('stairs-type') as HTMLSelectElement,
            textContent: document.getElementById('text-content') as HTMLTextAreaElement,
            textHeight: document.getElementById('text-height') as HTMLInputElement,
            textStyle: document.getElementById('text-style') as HTMLSelectElement,
            textColor: document.getElementById('text-color') as HTMLInputElement,
            pathWidth: document.getElementById('path-width') as HTMLInputElement,
            pathColor: document.getElementById('path-color') as HTMLInputElement,
            pdfOpacity: document.getElementById('pdf-opacity') as HTMLInputElement,
            dimensionStyle: document.getElementById('dimension-style') as HTMLSelectElement,
            dimensionTextOverride: document.getElementById('dimension-text-override') as HTMLTextAreaElement,
        };
        this.deleteButton = document.getElementById('delete-button')!;
        this.initListeners();
        this.hide();
    }

    private initListeners(): void {
        this.deleteButton.addEventListener('click', () => { this.app.deleteSelectedObjects(); });
        this.selectSameLayerButton.addEventListener('click', this.handleSelectSameLayer.bind(this));
        
        const createListener = (
            input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
            key: string,
            parser: (value: any) => any,
            live: boolean
        ) => {
            const update = (commit: boolean) => {
                if (this.app.selectedObjectIds.length === 0) return;
                
                let value: any;
                if (input.type === 'checkbox') {
                    value = (input as HTMLInputElement).checked;
                } else {
                    value = (input as HTMLInputElement).value;
                }
                const parsed = parser(value);
                if (parsed === undefined || (typeof parsed === 'number' && isNaN(parsed))) {
                    return;
                }
                this.app.updateSelectedObjectsProperty(key, parsed, commit);
            };

            if (live) {
                input.addEventListener('input', () => update(false));
                input.addEventListener('change', () => update(true));
            } else {
                input.addEventListener('change', () => update(true));
            }
        };

        const asFloat = (v: string) => parseFloat(v);
        const asAngle = (v: string) => parseFloat(v) * Math.PI / 180;
        const asString = (v: string) => v;
        const asIs = (v: any) => v; // for selects and checkboxes

        // Link all inputs to their respective properties
        createListener(this.inputs.objectX, 'x', asFloat, false);
        createListener(this.inputs.objectY, 'y', asFloat, false);
        createListener(this.inputs.objectWidth, 'width', asFloat, false);
        createListener(this.inputs.objectHeight, 'height', asFloat, false);
        createListener(this.inputs.objectAngle, 'angle', asAngle, false);
        createListener(this.inputs.circleRadius, 'radius', asFloat, false);

        createListener(this.inputs.genericColor, 'color', asString, true);
        createListener(this.inputs.genericLinewidth, 'lineWidth', asFloat, false);

        createListener(this.inputs.wallP1x, 'p1x', asFloat, false);
        createListener(this.inputs.wallP1y, 'p1y', asFloat, false);
        createListener(this.inputs.wallP2x, 'p2x', asFloat, false);
        createListener(this.inputs.wallP2y, 'p2y', asFloat, false);
        createListener(this.inputs.wallType, 'type', asIs, false);
        createListener(this.inputs.wallThickness, 'thickness', asFloat, false);
        createListener(this.inputs.wallColor, 'color', asString, true);

        createListener(this.inputs.symbolColor, 'color', asString, true);

        createListener(this.inputs.stairsType, 'stairsType', asIs, false);

        createListener(this.inputs.textContent, 'text', asString, true);
        createListener(this.inputs.textHeight, 'height', asFloat, false);
        createListener(this.inputs.textStyle, 'styleName', asString, false);
        createListener(this.inputs.textColor, 'color', asString, true);

        createListener(this.inputs.pathWidth, 'width', asFloat, false);
        createListener(this.inputs.pathColor, 'color', asString, true);

        createListener(this.inputs.pdfOpacity, 'opacity', (v) => parseFloat(v) / 100, true);

        createListener(this.inputs.polylineClosed, 'isClosed', asIs, false);
        createListener(this.inputs.hatchScale, 'patternScale', asFloat, false);
        createListener(this.inputs.hatchAngle, 'angle', asAngle, false);

        createListener(this.inputs.hatchPattern, 'pattern', asIs, false);
        createListener(this.inputs.hatchColor, 'color', asString, true);

        createListener(this.inputs.dimensionStyle, 'styleName', asString, false);
        createListener(this.inputs.dimensionTextOverride, 'textOverride', asString, false);
    }

    // FIX: Implement the required onSelectionChanged method.
    public onSelectionChanged(selectedObjects: SceneObject[]): void {
        this.show(selectedObjects);
    }

    private handleSelectSameLayer(): void {
        const firstSelectedId = this.app.selectedObjectIds[0];
        if (firstSelectedId === undefined) return;

        // FIX: Use layerService.
        const firstLayer = this.app.layerService.getLayerForObject(firstSelectedId);
        if (!firstLayer) return;

        // FIX: Use sceneService.
        const objectsOnLayer = this.app.sceneService.objects.filter(obj => 
            this.app.layerService.getLayerForObject(obj.id)?.id === firstLayer.id
        );
        
        this.app.setSelectedObjectIds(objectsOnLayer.map(obj => obj.id));
    }
    
    private getCommonValue(objects: SceneObject[], key: string): any {
        if (objects.length === 0) return undefined;
        const firstValue = (objects[0] as any)[key];
        if (firstValue === undefined) return undefined;
        for (let i = 1; i < objects.length; i++) {
            if ((objects[i] as any)[key] !== firstValue) { return 'multiple'; }
        }
        return firstValue;
    }
    
    private showPropertyRows(groupName: string): void {
        this.panel.querySelectorAll<HTMLElement>(`tr[data-property-row="${groupName}"]`).forEach(row => {
            row.style.display = 'table-row';
        });
    }

    show(objects: SceneObject[]): void {
        this.panel.querySelectorAll<HTMLElement>('tr[data-property-row]').forEach(row => { row.style.display = 'none'; });
        this.multipleSelectionInfo.style.display = 'none';

        if (objects.length === 0) {
            this.hide();
            return;
        }

        this.app.windowManager.showWindow('properties-window');

        if (objects.length > 1) {
            this.multipleSelectionInfo.style.display = 'block';
            // FIX: The t function takes multiple arguments, not an object.
            this.multipleSelectionText.textContent = this.i18n.t('properties.multipleSelected', objects.length);
            
            // FIX: Use layerService.
            const firstLayerId = this.app.layerService.getLayerForObject(objects[0].id)?.id;
            const allOnSameLayer = objects.every(obj => this.app.layerService.getLayerForObject(obj.id)?.id === firstLayerId);
            this.selectSameLayerButton.disabled = allOnSameLayer;
            
            const everyHasAngle = objects.every(o => 'angle' in o);
            if (everyHasAngle) {
                this.showPropertyRows('transform');
                const commonAngle = this.getCommonValue(objects, 'angle');
                const angleInput = this.inputs.objectAngle as HTMLInputElement;
                if (commonAngle === 'multiple') {
                    angleInput.value = '';
                    angleInput.placeholder = this.i18n.t('properties.multipleValues');
                } else {
                    angleInput.value = (commonAngle * 180 / Math.PI).toFixed(1);
                    angleInput.placeholder = '';
                }
            }
            const everyIsDoor = objects.every(o => o instanceof SymbolObject); // Assuming Door is SymbolObject, adjust if separate
            if (everyIsDoor) {
                this.showPropertyRows('geometry');
                this.showPropertyRows('transform');
                // Door-specific: width, height, angle already covered
            }
            const everyIsWindow = objects.every(o => o instanceof SymbolObject); // Assuming Window is SymbolObject
            if (everyIsWindow) {
                this.showPropertyRows('geometry');
                this.showPropertyRows('transform');
            }
            const everyIsStairs = objects.every(o => o instanceof StairsObject);
            if (everyIsStairs) {
                this.showPropertyRows('geometry');
                this.showPropertyRows('transform');
                this.showPropertyRows('stairs');
                const commonType = this.getCommonValue(objects, 'stairsType');
                (this.inputs.stairsType as HTMLSelectElement).value = commonType === 'multiple' ? '' : commonType;
            }
            const everyIsSymbol = objects.every(o => o instanceof SymbolObject);
            if (everyIsSymbol && !everyIsDoor && !everyIsWindow) {
                this.showPropertyRows('geometry');
                this.showPropertyRows('transform');
                this.showPropertyRows('symbol');
                const commonColor = this.getCommonValue(objects, 'color');
                (this.inputs.symbolColor as HTMLInputElement).value = commonColor === 'multiple' ? '#000000' : commonColor;
            }
            const everyIsHatch = objects.every(o => o instanceof HatchObject);
            if (everyIsHatch) {
                this.showPropertyRows('hatch');
                const commonPattern = this.getCommonValue(objects, 'pattern');
                (this.inputs.hatchPattern as HTMLSelectElement).value = commonPattern === 'multiple' ? '' : commonPattern;
                const commonScale = this.getCommonValue(objects, 'patternScale');
                (this.inputs.hatchScale as HTMLInputElement).value = commonScale === 'multiple' ? '' : commonScale;
                (this.inputs.hatchScale as HTMLInputElement).placeholder = commonScale === 'multiple' ? this.i18n.t('properties.multipleValues') : '';
                const commonAngle = this.getCommonValue(objects, 'angle');
                (this.inputs.hatchAngle as HTMLInputElement).value = commonAngle === 'multiple' ? '' : (commonAngle * 180 / Math.PI).toFixed(1);
                (this.inputs.hatchAngle as HTMLInputElement).placeholder = commonAngle === 'multiple' ? this.i18n.t('properties.multipleValues') : '';
                const commonColor = this.getCommonValue(objects, 'color');
                (this.inputs.hatchColor as HTMLInputElement).value = commonColor === 'multiple' ? '#000000' : commonColor;
            }
            const everyIsWall = objects.every(o => o instanceof Wall);
            if (everyIsWall) {
                this.showPropertyRows('wall');
                const commonType = this.getCommonValue(objects, 'type');
                (this.inputs.wallType as HTMLSelectElement).value = commonType === 'multiple' ? '' : commonType;
                const commonThickness = this.getCommonValue(objects, 'thickness');
                (this.inputs.wallThickness as HTMLInputElement).value = commonThickness === 'multiple' ? '' : commonThickness;
                (this.inputs.wallThickness as HTMLInputElement).placeholder = commonThickness === 'multiple' ? this.i18n.t('properties.multipleValues') : '';
                const commonColor = this.getCommonValue(objects, 'color');
                (this.inputs.wallColor as HTMLInputElement).value = commonColor === 'multiple' ? '#000000' : commonColor;
            }
            const everyHasColor = objects.every(o => 'color' in o);
            if (everyHasColor && !everyIsWall) {
                 this.showPropertyRows('symbol');
                 const commonColor = this.getCommonValue(objects, 'color');
                 (this.inputs.symbolColor as HTMLInputElement).value = commonColor === 'multiple' ? '#000000' : commonColor;
            }
            const everyIsDimension = objects.every(o => o instanceof DimensionObject);
            if (everyIsDimension) {
                this.showPropertyRows('dimension');
                
                const styleSelect = this.inputs.dimensionStyle as HTMLSelectElement;
                styleSelect.innerHTML = '';
                this.app.styleManager.getAllDimensionStyleNames().forEach(name => {
                    const option = document.createElement('option');
                    option.value = name;
                    option.textContent = name;
                    styleSelect.appendChild(option);
                });
                const commonStyle = this.getCommonValue(objects, 'styleName');
                styleSelect.value = commonStyle === 'multiple' ? '' : commonStyle;

                const overrideInput = this.inputs.dimensionTextOverride as HTMLTextAreaElement;
                const commonOverride = this.getCommonValue(objects, 'textOverride');
                if (commonOverride === 'multiple') {
                    overrideInput.value = '';
                    overrideInput.placeholder = this.i18n.t('properties.autoCalculated');
                } else {
                    overrideInput.value = commonOverride || '';
                    overrideInput.placeholder = this.i18n.t('properties.autoCalculated');
                }
            }
            const everyIsGroup = objects.every(o => o instanceof GroupObject);
            if (everyIsGroup) {
                // For groups, show only basic geometry and indicate multiple objects
                this.showPropertyRows('geometry');
                this.multipleSelectionInfo.style.display = 'block';
                this.multipleSelectionText.textContent = this.i18n.t('properties.groupSelected', objects.length);
            }
            return;
        }
        
        const object = objects[0];

        const bbox = object.getBoundingBox(this.app);
        this.showPropertyRows('geometry');
        (this.inputs.objectX as HTMLInputElement).value = object.getCenter(this.app).x.toFixed(2);
        (this.inputs.objectY as HTMLInputElement).value = object.getCenter(this.app).y.toFixed(2);
        (this.inputs.objectWidth as HTMLInputElement).value = (bbox.maxX - bbox.minX).toFixed(2);
        (this.inputs.objectHeight as HTMLInputElement).value = (bbox.maxY - bbox.minY).toFixed(2);
        
        if ('angle' in object) {
            this.showPropertyRows('transform');
            (this.inputs.objectAngle as HTMLInputElement).value = ((object as any).angle * 180 / Math.PI).toFixed(1);
        }

        if (object instanceof Wall) {
            this.showPropertyRows('wall-geometry');
            this.showPropertyRows('wall');
            (this.inputs.wallP1x as HTMLInputElement).value = object.p1.x.toFixed(2);
            (this.inputs.wallP1y as HTMLInputElement).value = object.p1.y.toFixed(2);
            (this.inputs.wallP2x as HTMLInputElement).value = object.p2.x.toFixed(2);
            (this.inputs.wallP2y as HTMLInputElement).value = object.p2.y.toFixed(2);
            (this.inputs.wallLength as HTMLInputElement).value = object.getLength().toFixed(2);
            (this.inputs.wallType as HTMLSelectElement).value = object.type;
            (this.inputs.wallThickness as HTMLInputElement).value = object.thickness.toString();
            (this.inputs.wallColor as HTMLInputElement).value = object.color;
        }
        if (object instanceof EvacuationPath || object instanceof EmergencyEvacuationPath) {
            this.showPropertyRows('path-geometry');
            this.showPropertyRows('evacuation-path');
            (this.inputs.pathLength as HTMLInputElement).value = object.getLength().toFixed(2);
            (this.inputs.pathVertices as HTMLInputElement).value = object.points.length.toString();
            (this.inputs.pathWidth as HTMLInputElement).value = object.width.toString();
            (this.inputs.pathColor as HTMLInputElement).value = object.color;
        }
        if (object instanceof PolylineObject) {
            this.showPropertyRows('polyline-geometry');
            this.showPropertyRows('generic-appearance');
            (this.inputs.polylineLength as HTMLInputElement).value = object.getLength().toFixed(2);
            (this.inputs.polylineVertices as HTMLInputElement).value = object.points.length.toString();
            (this.inputs.polylineClosed as HTMLInputElement).checked = object.isClosed;
            (this.inputs.genericColor as HTMLInputElement).value = object.color;
            (this.inputs.genericLinewidth as HTMLInputElement).value = object.lineWidth.toString();
        }
        if (object instanceof CircleObject) {
            this.showPropertyRows('circle-geometry');
            this.showPropertyRows('generic-appearance');
            (this.inputs.circleCx as HTMLInputElement).value = object.center.x.toFixed(2);
            (this.inputs.circleCy as HTMLInputElement).value = object.center.y.toFixed(2);
            (this.inputs.circleRadius as HTMLInputElement).value = object.radius.toFixed(2);
            (this.inputs.genericColor as HTMLInputElement).value = object.color;
            (this.inputs.genericLinewidth as HTMLInputElement).value = object.lineWidth.toString();
        }
        if (object instanceof ArcObject) {
            this.showPropertyRows('arc-geometry');
            this.showPropertyRows('generic-appearance');
            (this.inputs.arcCx as HTMLInputElement).value = object.center.x.toFixed(2);
            (this.inputs.arcCy as HTMLInputElement).value = object.center.y.toFixed(2);
            (this.inputs.arcRadius as HTMLInputElement).value = object.radius.toFixed(2);
            (this.inputs.arcStartAngle as HTMLInputElement).value = (object.startAngle * 180 / Math.PI).toFixed(1);
            (this.inputs.arcEndAngle as HTMLInputElement).value = (object.endAngle * 180 / Math.PI).toFixed(1);
            (this.inputs.genericColor as HTMLInputElement).value = object.color;
            (this.inputs.genericLinewidth as HTMLInputElement).value = object.lineWidth.toString();
        }
        if (object instanceof HatchObject) {
            this.showPropertyRows('hatch');
            (this.inputs.hatchPattern as HTMLSelectElement).value = object.pattern;
            (this.inputs.hatchScale as HTMLInputElement).value = object.patternScale.toString();
            (this.inputs.hatchAngle as HTMLInputElement).value = (object.angle * 180 / Math.PI).toFixed(1);
            (this.inputs.hatchColor as HTMLInputElement).value = object.color;
        }
        if (object instanceof SymbolObject) {
            this.showPropertyRows('geometry');
            this.showPropertyRows('transform');
            this.showPropertyRows('symbol');
            (this.inputs.symbolColor as HTMLInputElement).value = object.color;
        }
        if (object instanceof StairsObject) {
            this.showPropertyRows('geometry');
            this.showPropertyRows('transform');
            this.showPropertyRows('stairs');
            (this.inputs.stairsType as HTMLSelectElement).value = object.stairsType;
        }
        if (object instanceof TextObject) {
            this.showPropertyRows('text');
            const styleSelect = this.inputs.textStyle as HTMLSelectElement;
            styleSelect.innerHTML = '';
            this.app.styleManager.getAllTextStyleNames().forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                styleSelect.appendChild(option);
            });
            styleSelect.value = object.styleName;
            (this.inputs.textContent as HTMLTextAreaElement).value = object.text;
            (this.inputs.textHeight as HTMLInputElement).value = object.height.toString();
            (this.inputs.textColor as HTMLInputElement).value = object.color;
        }
        if (object instanceof PdfUnderlay) {
            this.showPropertyRows('pdf');
            (this.inputs.pdfOpacity as HTMLInputElement).value = (object.opacity * 100).toString();
        }
        if (object instanceof DimensionObject) {
            this.showPropertyRows('dimension');

            const styleSelect = this.inputs.dimensionStyle as HTMLSelectElement;
            styleSelect.innerHTML = '';
            this.app.styleManager.getAllDimensionStyleNames().forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                styleSelect.appendChild(option);
            });
            styleSelect.value = object.styleName;

            const overrideInput = this.inputs.dimensionTextOverride as HTMLTextAreaElement;
            overrideInput.value = object.textOverride || '';
            overrideInput.placeholder = this.i18n.t('properties.autoCalculated');
        }
        if (object instanceof GroupObject) {
            // For single group selection, show geometry and indicate group
            this.showPropertyRows('geometry');
            this.multipleSelectionInfo.style.display = 'block';
            this.multipleSelectionText.textContent = this.i18n.t('properties.groupSelected', object.objects.length);
        }
    }

    hide(): void {
        this.app.windowManager.hideWindow('properties-window');
    }
}
