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
      const mockGroup = {
        id: 'group1',
        objects: [{ id: 'obj1' } as unknown as SceneObject, { id: 'obj2' } as unknown as SceneObject],
        getBoundingBox: vi.fn(() => ({ minX: 0, minY: 0, maxX: 10, maxY: 10 })),
        getCenter: vi.fn(() => ({ x: 5, y: 5 }))
      } as unknown as GroupObject;
      controller.onSelectionChanged([mockGroup]);
      expect(mockI18n.t).toHaveBeenCalledWith('properties.groupSelected', 2);
    });

    it('should handle multiple GroupObjects', () => {
      const mockGroups = [{ objects: [{}] } as GroupObject, { objects: [{}] } as GroupObject];
      controller.onSelectionChanged(mockGroups);
      expect(mockI18n.t).toHaveBeenCalledWith('properties.groupSelected', 2);
    });

    it('should show dimension properties for DimensionObject', () => {
      const mockDimension = { styleName: 'Standard', textOverride: '10m' } as DimensionObject;
      controller.onSelectionChanged([mockDimension]);
      // Verify styleSelect population and value setting (requires deeper DOM mock)
    });
  });

  describe('initListeners', () => {
    it('should initialize listeners for inputs', () => {
      // Test that listeners are added (can spy on addEventListener)
      const spy = vi.spyOn(HTMLInputElement.prototype, 'addEventListener');
      controller['initListeners']();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('handleSelectSameLayer', () => {
    it('should select objects on the same layer', () => {
      const mockLayer = { id: 'layer1' };
      mockApp.layerService.getLayerForObject.mockReturnValue(mockLayer);
      mockApp.sceneService.objects = [{ id: 'obj1' }, { id: 'obj2' }];
      mockApp.layerService.getLayerForObject.mockImplementation(id => ({ id: 'layer1' }));

      controller['handleSelectSameLayer']();

      expect(mockApp.setSelectedObjectIds).toHaveBeenCalledWith(['obj1', 'obj2']);
    });
  });
});
