
import DxfParser from 'dxf-parser';
import { SceneService } from './scene.service';
import { LayerService } from './layer.service';
import { PolylineObject } from '../scene/polyline-object';
import { Point } from '../scene/point';
import { LineObject } from '../scene/line-object';
import { CircleObject } from '../scene/circle-object';
import { ArcObject } from '../scene/arc-object';
import { SplineObject } from '../scene/spline-object';
import { TextObject } from '../scene/text-object';
import { Layer } from '../layer';
import { BlockDefinition } from '../scene/block-definition';
import { InsertObject } from '../scene/insert-object';

export class DxfImportService {
  private static readonly SUPPORTED_ENTITIES = [
    'LINE',
    'POLYLINE',
    'LWPOLYLINE',
    'CIRCLE',
    'ARC',
    'SPLINE',
    'TEXT',
    'INSERT',
  ];

  public static async import(
    file: File,
    sceneService: SceneService,
    layerService: LayerService
  ): Promise<void> {
    const fileContent = await file.text();
    const parser = new DxfParser();
    try {
      const dxf = parser.parseSync(fileContent);
      this.importLayers(dxf, layerService);
      this.importBlocks(dxf, sceneService, layerService);
      this.importEntities(dxf, sceneService, layerService);
    } catch (err) {
      console.error('Помилка парсингу DXF:', err);
      throw err;
    }
  }

  // Для тестів: імпорт з рядка
  public static async importDxf(
    content: string
  ): Promise<any[]> {
    const parser = new DxfParser();
    try {
      const dxf = parser.parseSync(content);
      const importedObjects: any[] = [];
      // Імітувати імпорт без додавання до scene (для тестів)
      const mockLayerService = {
        getLayer: () => ({ name: '0', objectIds: [] }),
        defaultLayer: { name: '0', objectIds: [] }
      };
      if (dxf.entities) {
        for (const entity of dxf.entities) {
          if (this.SUPPORTED_ENTITIES.includes(entity.type)) {
            const obj = this.createSceneObject(entity, mockLayerService as any);
            if (obj) {
              importedObjects.push(obj);
            }
          }
        }
      }
      return importedObjects;
    } catch (err) {
      console.error('Помилка парсингу DXF для тестів:', err);
      return [];
    }
  }

  private static importLayers(dxf: any, layerService: LayerService): void {
    if (dxf.tables && dxf.tables.layer && dxf.tables.layer.layers) {
      for (const layerName in dxf.tables.layer.layers) {
        const layerData = dxf.tables.layer.layers[layerName];
        if (!layerService.getLayer(layerName)) {
          layerService.addLayer(layerName, false);
          const newLayer = layerService.getLayer(layerName)!;
          newLayer.color = this.aciToColor(layerData.color);
          newLayer.isVisible = !layerData.frozen;
          newLayer.linetype = layerData.linetype || 'CONTINUOUS';
        }
      }
    }
  }

  private static importBlocks(
    dxf: any,
    sceneService: SceneService,
    layerService: LayerService
  ): void {
    if (dxf.blocks) {
      for (const blockName in dxf.blocks) {
        const blockData = dxf.blocks[blockName];
        const blockDef = new BlockDefinition(blockData.name, { x: blockData.basePoint.x, y: blockData.basePoint.y });

        if (blockData.entities) {
          for (const entity of blockData.entities) {
            if (this.SUPPORTED_ENTITIES.includes(entity.type)) {
              const obj = this.createSceneObject(entity, layerService);
              if (obj) {
                blockDef.addObject(obj);
              }
            }
          }
        }
        sceneService.addBlockDefinition(blockDef);
      }
    }
  }

  private static importEntities(
    dxf: any,
    sceneService: SceneService,
    layerService: LayerService
  ): void {
    if (dxf.entities) {
      for (const entity of dxf.entities) {
        if (this.SUPPORTED_ENTITIES.includes(entity.type)) {
          const obj = this.createSceneObject(entity, layerService);
          if (obj) {
            const id = sceneService.getNextId();
            obj.id = id;
            sceneService.add(obj);
            const layer = layerService.getLayer(entity.layer) || layerService.defaultLayer;
            layer.objectIds.push(id);
          }
        }
      }
    }
  }

  private static aciToColor(aci: number): string {
    // Простий мапінг ACI кольорів до HEX (основні кольори)
    const aciColors: { [key: number]: string } = {
      1: '#FF0000', // Red
      2: '#00FF00', // Green
      3: '#0000FF', // Blue
      4: '#FFFF00', // Cyan
      5: '#FF00FF', // Magenta
      6: '#00FFFF', // Yellow
      7: '#FFFFFF', // White
      8: '#000000', // Black
      // Додати більше за потребою
    };
    return aciColors[aci] || '#000000';
  }

  private static createSceneObject(
    entity: any,
    layerService: LayerService
  ): any {
    const layer = layerService.getLayer(entity.layer) || layerService.defaultLayer;
    let obj = null;

    switch (entity.type) {
      case 'LINE':
        obj = new LineObject(
          0, // ID буде встановлено пізніше
          { x: entity.start.x, y: entity.start.y },
          { x: entity.end.x, y: entity.end.y }
        );
        break;
      case 'POLYLINE':
      case 'LWPOLYLINE':
        const points = entity.vertices.map(
          (v: any) => ({ x: v.x, y: v.y })
        );
        obj = new PolylineObject(0, points);
        if (entity.closed || entity.shape) {
          (obj as PolylineObject).isClosed = true;
        }
        break;
      case 'CIRCLE':
        obj = new CircleObject(
          0,
          { x: entity.center.x, y: entity.center.y },
          entity.radius
        );
        break;
      case 'ARC':
        // DXF куті в градусах, припустимо ArcObject приймає градуси
        obj = new ArcObject(
          0,
          { x: entity.center.x, y: entity.center.y },
          entity.radius,
          entity.startAngle,
          entity.endAngle,
          false
        );
        break;
      case 'SPLINE':
        const controlPoints = entity.controlPoints.map(
          (p: any) => ({ x: p.x, y: p.y })
        );
        obj = new SplineObject(0, controlPoints, entity.degree, entity.knots);
        break;
      case 'TEXT':
        obj = new TextObject(
          0,
          entity.insertionPoint.x,
          entity.insertionPoint.y,
          entity.text,
          'Standard'
        );
        obj.height = entity.textHeight || 24;
        obj.angle = entity.rotation || 0;
        break;
      case 'INSERT':
        const pos = { x: entity.insertionPoint.x, y: entity.insertionPoint.y };
        obj = new InsertObject(
          0,
          entity.name,
          pos
        );
        obj.insertScale = { x: entity.scaleX || 1, y: entity.scaleY || 1 };
        obj.rotation = entity.rotation || 0;
        break;
    }

    if (obj) {
      obj.layer = layer;
      if (entity.color) {
        obj.color = this.aciToColor(entity.color);
      }
      if (entity.linetype) {
        // Припустимо, що об'єкти мають linetype, додати пізніше
        // obj.linetype = entity.linetype;
      }
    }
    return obj;
  }
}
