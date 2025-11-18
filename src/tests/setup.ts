import { vi } from 'vitest';

// Mock global objects
global.window = {
  getComputedStyle: vi.fn().mockImplementation(() => ({
    getPropertyValue: vi.fn().mockReturnValue('#000000'),
  })),
} as any;

global.document = {
  documentElement: {
    style: {
      getPropertyValue: vi.fn().mockReturnValue('#000000'),
    },
  },
  createElement: vi.fn().mockReturnValue({
    style: {},
  }),
} as any;

// Mock getComputedStyle globally
global.getComputedStyle = vi.fn().mockImplementation(() => ({
  getPropertyValue: vi.fn().mockReturnValue('#000000'),
}));

// Mock DxfWriter
vi.mock('dxf-writer', () => ({
  default: vi.fn().mockImplementation(function() {
    this.addEntity = vi.fn().mockImplementation((entity) => {
      if (entity.type === 'POLYLINE') {
        this.toDxfString = vi.fn().mockReturnValue('SECTION\nENTITIES\n0\nLWPOLYLINE\n90\n3\n10\n0.0\n20\n0.0\n10\n1.0\n20\n0.0\n10\n0.0\n20\n1.0\nENDSEC\nEOF');
      } else if (entity.type === 'CIRCLE') {
        this.toDxfString = vi.fn().mockReturnValue('SECTION\nENTITIES\n0\nCIRCLE\n10\n0.0\n20\n0.0\n30\n0.0\n40\n1.0\nENDSEC\nEOF');
      } else {
        this.toDxfString = vi.fn().mockReturnValue('SECTION\nENTITIES\nENDSEC\nEOF');
      }
    });
    this.addLayer = vi.fn();
    this.addBlock = vi.fn();
    this.toDxfString = vi.fn().mockReturnValue('SECTION\nENTITIES\nENDSEC\nEOF');
  }),
  DxfWriter: vi.fn().mockImplementation(function() {
    this.addEntity = vi.fn().mockImplementation((entity) => {
      if (entity.type === 'POLYLINE') {
        this.toDxfString = vi.fn().mockReturnValue('SECTION\nENTITIES\n0\nLWPOLYLINE\n90\n3\n10\n0.0\n20\n0.0\n10\n1.0\n20\n0.0\n10\n0.0\n20\n1.0\nENDSEC\nEOF');
      } else if (entity.type === 'CIRCLE') {
        this.toDxfString = vi.fn().mockReturnValue('SECTION\nENTITIES\n0\nCIRCLE\n10\n0.0\n20\n0.0\n30\n0.0\n40\n1.0\nENDSEC\nEOF');
      } else {
        this.toDxfString = vi.fn().mockReturnValue('SECTION\nENTITIES\nENDSEC\nEOF');
      }
    });
    this.addLayer = vi.fn();
    this.addBlock = vi.fn();
    this.toDxfString = vi.fn().mockReturnValue('SECTION\nENTITIES\nENDSEC\nEOF');
  }),
  ACI: {
    WHITE: 7,
  },
}));

// Mock DxfParser
vi.mock('dxf-parser', () => ({
  default: vi.fn().mockImplementation(function() {
    this.parseSync = vi.fn().mockImplementation((content) => {
      if (content.includes('LWPOLYLINE')) {
        return {
          entities: [{
            type: 'LWPOLYLINE',
            vertices: [
              { x: 0.0, y: 0.0 },
              { x: 50.0, y: 0.0 },
              { x: 50.0, y: 50.0 }
            ],
            closed: true,
            layer: '0'
          }],
          tables: { layer: { layers: {} } },
          blocks: {}
        };
      } else if (content.includes('CIRCLE')) {
        return {
          entities: [{
            type: 'CIRCLE',
            center: { x: 0.0, y: 0.0 },
            radius: 25.0,
            layer: '0'
          }],
          tables: { layer: { layers: {} } },
          blocks: {}
        };
      } else if (content.includes('LINE')) {
        return {
          entities: [{
            type: 'LINE',
            start: { x: 0.0, y: 0.0 },
            end: { x: 100.0, y: 0.0 },
            layer: '0'
          }],
          tables: { layer: { layers: {} } },
          blocks: {}
        };
      } else {
        return {
          entities: [],
          tables: { layer: { layers: {} } },
          blocks: {}
        };
      }
    });
  }),
}));

// Mock THREE.js globally
global.THREE = {
  BoxGeometry: vi.fn().mockImplementation(function() {
    this.dispose = vi.fn();
  }),
  MeshStandardMaterial: vi.fn().mockImplementation(function() {
    this.dispose = vi.fn();
  }),
  Mesh: vi.fn().mockImplementation(function(geometry, material) {
    this.geometry = geometry || new global.THREE.BufferGeometry();
    this.material = material;
    this.dispose = vi.fn();
    this.getOrCreateMesh = vi.fn().mockReturnValue(this);
  }),
  BufferGeometry: vi.fn().mockImplementation(function() {
    this.attributes = {
      position: {
        array: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0])
      }
    };
    this.index = {
      array: new Uint16Array([0, 1, 2])
    };
    this.dispose = vi.fn();
    this.setFromPoints = vi.fn();
    this.setIndex = vi.fn();
  }),
  Vector3: vi.fn().mockImplementation(function(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.clone = vi.fn().mockReturnThis();
    this.add = vi.fn().mockReturnThis();
    this.multiplyScalar = vi.fn().mockReturnThis();
  }),
  BufferAttribute: vi.fn().mockImplementation(function() {
    this.dispose = vi.fn();
  }),
} as any;

// Mock HTMLInputElement
global.HTMLInputElement = class HTMLInputElement {
  value = '';
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
} as any;

// Mock HTMLElement
global.HTMLElement = class HTMLElement {
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
} as any;

// Mock console methods to reduce noise
global.console = {
  ...console,
  warn: vi.fn(),
  error: vi.fn(),
};
