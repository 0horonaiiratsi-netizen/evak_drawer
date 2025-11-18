/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { App } from '../app';
import { RotateTool } from '../tools/rotate-tool';
import { ScaleTool } from '../tools/scale-tool';
import { RotateByReferenceTool } from '../tools/rotate-by-reference-tool';
import { ScaleByReferenceTool } from '../tools/scale-by-reference-tool';
import { Wall } from '../scene/wall';
import { LineObject } from '../scene/line-object';
import { Point } from '../scene/point';
import { ToolType } from '../tools/tool';

// Mock App and its dependencies
const mockApp = {
    selectionService: {
        selectedIds: [1],
        set: vi.fn(),
    },
    layerService: {
        getLayerForObject: vi.fn(),
    },
    sceneService: {
        objects: [],
        findById: vi.fn(),
        getNextId: vi.fn(() => 2),
    },
    dialogController: {
        alert: vi.fn(),
        prompt: vi.fn(),
    },
    commandLineController: {
        setPrompt: vi.fn(),
    },
    canvasController: {
        setPreviewLine: vi.fn(),
        zoom: 1,
    },
    projectStateService: {
        commit: vi.fn(),
    },
    inputHandler: {
        updateCursor: vi.fn(),
    },
    propertiesController: {
        show: vi.fn(),
    },
    addSceneObject: vi.fn(),
    setActiveTool: vi.fn(),
    draw: vi.fn(),
    isSnappingEnabled: false,
    snapModes: new Set(),
} as any;

describe('RotateTool', () => {
    let rotateTool: RotateTool;

    beforeEach(() => {
        rotateTool = new RotateTool(mockApp);
        vi.clearAllMocks();
    });

    it('should activate and check selection', () => {
        mockApp.selectionService.selectedIds = [];
        rotateTool.activate();
        expect(mockApp.dialogController.alert).toHaveBeenCalledWith("Обертання", "Спочатку виділіть об'єкти для обертання.");
    });

    it('should rotate objects correctly', async () => {
        const wall = new Wall(1, { x: 0, y: 0 }, { x: 10, y: 0 });
        mockApp.sceneService.objects = [wall];
        mockApp.selectionService.selectedIds = [1];
        mockApp.dialogController.prompt.mockResolvedValue('90');

        rotateTool.activate();
        await rotateTool.onMouseDown({ x: 0, y: 0 }, {} as MouseEvent);

        expect(mockApp.sceneService.getNextId).toHaveBeenCalled();
        expect(mockApp.projectStateService.commit).toHaveBeenCalledWith("Rotate objects");
    });

    it('should handle invalid angle input', async () => {
        const wall = new Wall(1, { x: 0, y: 0 }, { x: 10, y: 0 });
        mockApp.sceneService.objects = [wall];
        mockApp.selectionService.selectedIds = [1];
        mockApp.dialogController.prompt.mockResolvedValue('invalid');

        rotateTool.activate();
        await rotateTool.onMouseDown({ x: 0, y: 0 }, {} as MouseEvent);

        expect(mockApp.selectionService.set).not.toHaveBeenCalled();
    });
});

describe('ScaleTool', () => {
    let scaleTool: ScaleTool;

    beforeEach(() => {
        scaleTool = new ScaleTool(mockApp);
        vi.clearAllMocks();
    });

    it('should activate and check selection', () => {
        mockApp.selectionService.selectedIds = [];
        scaleTool.activate();
        expect(mockApp.dialogController.alert).toHaveBeenCalledWith("Масштабування", "Спочатку виділіть об'єкти для масштабування.");
    });

    it('should scale objects correctly', async () => {
        const wall = new Wall(1, { x: 0, y: 0 }, { x: 10, y: 0 });
        mockApp.sceneService.objects = [wall];
        mockApp.selectionService.selectedIds = [1];
        mockApp.dialogController.prompt.mockResolvedValue('2');

        scaleTool.activate();
        await scaleTool.onMouseDown({ x: 0, y: 0 }, {} as MouseEvent);

        expect(mockApp.sceneService.getNextId).toHaveBeenCalled();
        expect(mockApp.projectStateService.commit).toHaveBeenCalledWith("Scale objects");
    });

    it('should handle invalid scale input', async () => {
        const wall = new Wall(1, { x: 0, y: 0 }, { x: 10, y: 0 });
        mockApp.sceneService.objects = [wall];
        mockApp.selectionService.selectedIds = [1];
        mockApp.dialogController.prompt.mockResolvedValue('invalid');

        scaleTool.activate();
        await scaleTool.onMouseDown({ x: 0, y: 0 }, {} as MouseEvent);

        expect(mockApp.selectionService.set).not.toHaveBeenCalled();
    });
});

describe('RotateByReferenceTool', () => {
    let rotateByRefTool: RotateByReferenceTool;

    beforeEach(() => {
        rotateByRefTool = new RotateByReferenceTool(mockApp);
        vi.clearAllMocks();
    });

    it('should activate and check selection', async () => {
        mockApp.selectionService.selectedIds = [];
        await rotateByRefTool.activate();
        expect(mockApp.setActiveTool).toHaveBeenCalledWith(ToolType.SELECT);
    });

    it('should rotate by reference correctly', async () => {
        const line = new LineObject(1, { x: 0, y: 0 }, { x: 10, y: 0 });
        mockApp.sceneService.objects = [line];
        mockApp.selectionService.selectedIds = [1];
        mockApp.layerService.getLayerForObject = vi.fn(() => ({ isLocked: false }));
        mockApp.sceneService.findById = vi.fn(() => line);

        await rotateByRefTool.activate();
        await rotateByRefTool.onMouseDown({ x: 0, y: 0 }, {} as MouseEvent); // basePoint
        await rotateByRefTool.onMouseDown({ x: 10, y: 0 }, {} as MouseEvent); // referencePoint
        await rotateByRefTool.onMouseDown({ x: 10, y: 10 }, {} as MouseEvent); // targetPoint

        expect(mockApp.projectStateService.commit).toHaveBeenCalledWith("Rotate object by visual reference");
    });

    it('should handle locked layer', async () => {
        const line = new LineObject(1, { x: 0, y: 0 }, { x: 10, y: 0 });
        mockApp.sceneService.objects = [line];
        mockApp.selectionService.selectedIds = [1];
        mockApp.layerService.getLayerForObject = vi.fn(() => ({ isLocked: true }));
        mockApp.sceneService.findById = vi.fn(() => line);

        await rotateByRefTool.activate();
        await rotateByRefTool.onMouseDown({ x: 0, y: 0 }, {} as MouseEvent);

        expect(mockApp.dialogController.alert).toHaveBeenCalledWith("Помилка", "Неможливо змінити об'єкт на заблокованому шарі.");
    });
});

describe('ScaleByReferenceTool', () => {
    let scaleByRefTool: ScaleByReferenceTool;

    beforeEach(() => {
        scaleByRefTool = new ScaleByReferenceTool(mockApp);
        vi.clearAllMocks();
    });

    it('should activate and check selection', async () => {
        mockApp.selectionService.selectedIds = [];
        await scaleByRefTool.activate();
        expect(mockApp.setActiveTool).toHaveBeenCalledWith(ToolType.SELECT);
    });

    it('should scale by reference correctly', async () => {
        const line = new LineObject(1, { x: 0, y: 0 }, { x: 10, y: 0 });
        mockApp.sceneService.objects = [line];
        mockApp.selectionService.selectedIds = [1];
        mockApp.layerService.getLayerForObject = vi.fn(() => ({ isLocked: false }));
        mockApp.sceneService.findById = vi.fn(() => line);

        await scaleByRefTool.activate();
        await scaleByRefTool.onMouseDown({ x: 0, y: 0 }, {} as MouseEvent); // basePoint
        await scaleByRefTool.onMouseDown({ x: 10, y: 0 }, {} as MouseEvent); // referencePoint
        await scaleByRefTool.onMouseDown({ x: 20, y: 0 }, {} as MouseEvent); // targetPoint

        expect(mockApp.projectStateService.commit).toHaveBeenCalledWith("Scale object by visual reference");
    });

    it('should handle locked layer', async () => {
        const line = new LineObject(1, { x: 0, y: 0 }, { x: 10, y: 0 });
        mockApp.sceneService.objects = [line];
        mockApp.selectionService.selectedIds = [1];
        mockApp.layerService.getLayerForObject = vi.fn(() => ({ isLocked: true }));
        mockApp.sceneService.findById = vi.fn(() => line);

        await scaleByRefTool.activate();
        await scaleByRefTool.onMouseDown({ x: 0, y: 0 }, {} as MouseEvent);

        expect(mockApp.dialogController.alert).toHaveBeenCalledWith("Помилка", "Неможливо змінити об'єкт на заблокованому шарі.");
    });
});
