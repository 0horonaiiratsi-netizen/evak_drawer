import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PropertiesController } from '../properties-controller';
import { App } from '../app';
import { SceneObject } from '../scene/scene-object';
import { GroupObject } from '../scene/group-object';
import { Wall } from '../scene/wall';
import { DimensionObject } from '../scene/dimension-object';
import { I18nService } from '../i18n';
import { WindowManager } from '../window-manager';

// Mock classes and modules
vi.mock('../app');
vi.mock('../i18n');
vi.mock('../window-manager'); // Mock WindowManager

describe('PropertiesController', () => {
  let mockApp: vi.Mocked<App>;
  let mockI18n: vi.Mocked<I18nService>;
  let mockWindowManager: vi.Mocked<WindowManager>;
  let controller: PropertiesController;

  beforeEach(() => {
    mockApp = {
      i18n: {} as any,
      layerService: { getLayerForObject: vi.fn() },
      sceneService: { objects: [] },
      selectedObjectIds: [],
      windowManager: {} as any,
      deleteSelectedObjects: vi.fn(),
      updateSelectedObjectsProperty: vi.fn(),
      setSelectedObjectIds: vi.fn(),
      // Add other mocks as needed
    } as any;

    mockI18n = {
      t: vi.fn(),
    } as any;
    mockApp.i18n = mockI18n;

    mockWindowManager = {
      showWindow: vi.fn(),
      hideWindow: vi.fn(),
    } as any;
    mockApp.windowManager = mockWindowManager;

    // Mock DOM elements
    global.document = {
      getElementById: vi.fn().mockImplementation((id: string) => {
        const div = {
          id,
          style: {},
          classList: { add: vi.fn(), remove: vi.fn(), contains: vi.fn() },
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          querySelectorAll: vi.fn().mockReturnValue([]),
          innerHTML: '',
          value: '',
          checked: false,
          type: '',
          placeholder: '',
          textContent: '',
        };
        return div;
      }),
      createElement: vi.fn().mockImplementation((tag: string) => ({
        id: '',
        style: {},
        classList: { add: vi.fn(), remove: vi.fn(), contains: vi.fn() },
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        querySelectorAll: vi.fn().mockReturnValue([]),
        innerHTML: '',
        value: '',
        checked: false,
        type: '',
        placeholder: '',
        textContent: '',
      })),
    } as any;

    controller = new PropertiesController(mockApp);
  });

  describe('onSelectionChanged', () => {
    it('should hide panel when no objects selected', () => {
      controller.onSelectionChanged([]);
      expect(mockWindowManager.hideWindow).toHaveBeenCalledWith('properties-window');
    });

    it('should show properties window for single object', () => {
      const mockObject = { getBoundingBox: vi.fn(() => ({ minX: 0, minY: 0, maxX: 10, maxY: 10 })), getCenter: vi.fn(() => ({ x: 5, y: 5 })) } as SceneObject;
      controller.onSelectionChanged([mockObject]);
      expect(mockWindowManager.showWindow).toHaveBeenCalledWith('properties-window');
    });

    it('should handle multiple selection and show multiple info', () => {
      const mockObjects = [{} as SceneObject, {} as SceneObject];
      controller.onSelectionChanged(mockObjects);
      // Check if multipleSelectionInfo is displayed (would require mocking DOM more thoroughly)
      expect(mockI18n.t).toHaveBeenCalledWith('properties.multipleSelected', 2);
    });

    it('should handle GroupObject single selection', () => {
      const mockObj1 = {
        id: 1,
        getBoundingBox: vi.fn(() => ({ minX: 0, minY: 0, maxX: 10, maxY: 10 })),
        getCenter: vi.fn(() => ({ x: 5, y: 5 }))
      } as unknown as SceneObject;
      const mockObj2 = {
        id: 2,
        getBoundingBox: vi.fn(() => ({ minX: 10, minY: 10, maxX: 20, maxY: 20 })),
        getCenter: vi.fn(() => ({ x: 15, y: 15 }))
      } as unknown as SceneObject;
      const mockGroup = new GroupObject(1, [mockObj1, mockObj2]);
      controller.onSelectionChanged([mockGroup]);
      expect(mockI18n.t).toHaveBeenCalledWith('properties.groupSelected', 2);
    });

    it('should handle multiple GroupObjects', () => {
      const mockObj1 = { id: 1 } as SceneObject;
      const mockObj2 = { id: 2 } as SceneObject;
      const mockGroup1 = new GroupObject(1, [mockObj1]);
      const mockGroup2 = new GroupObject(2, [mockObj2]);
      controller.onSelectionChanged([mockGroup1, mockGroup2]);
      expect(mockI18n.t).toHaveBeenCalledWith('properties.multipleSelected', 2);
    });

    it('should show dimension properties for DimensionObject', () => {
      const mockDimension = {
        styleName: 'Standard',
        textOverride: '10m',
        id: 1,
        getBoundingBox: vi.fn(() => ({ minX: 0, minY: 0, maxX: 10, maxY: 10 })),
        getCenter: vi.fn(() => ({ x: 5, y: 5 })),
      } as unknown as DimensionObject;
      controller.onSelectionChanged([mockDimension]);
      // Verify styleSelect population and value setting (requires deeper DOM mock)
    });
  });

  describe('initListeners', () => {
    it('should initialize listeners for inputs', () => {
      // Test that listeners are added (can spy on addEventListener)
      const mockInput = (controller as any).inputs.objectX;
      const spy = vi.spyOn(mockInput, 'addEventListener');
      controller['initListeners']();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('handleSelectSameLayer', () => {
    it('should select objects on the same layer', () => {
      const mockLayer = { id: 'layer1' };
      mockApp.selectedObjectIds = [1];
      mockApp.sceneService.objects = [{ id: 1 } as SceneObject, { id: 2 } as SceneObject];
      mockApp.layerService.getLayerForObject.mockReturnValueOnce(mockLayer);
      mockApp.layerService.getLayerForObject.mockImplementation(id => ({ id: 'layer1' }));

      controller['handleSelectSameLayer']();

      expect(mockApp.setSelectedObjectIds).toHaveBeenCalledWith([1, 2]);
    });
  });
});
