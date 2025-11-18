/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { App } from '../app';
import { RotateTool } from '../tools/rotate-tool';
import { ScaleTool } from '../tools/scale-tool';
import { Wall } from '../scene/wall';
import { Point } from '../scene/point';
import { ToolType } from '../tools/tool';

// Mock App and its dependencies
const mockApp = {
    selectionService: {
        selectedIds: [1],
        set: vi.fn(),
    },
    sceneService: {
        objects: [],
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
    },
    projectStateService: {
        commit: vi.fn(),
    },
    inputHandler: {
        updateCursor: vi.fn(),
    },
    addSceneObject: vi.fn(),
    setActiveTool: vi.fn(),
    draw: vi.fn(),
    isSnappingEnabled: false,
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
