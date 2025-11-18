import { SceneService } from './scene.service';
import { LayerService } from './layer.service';
import { DxfImportService } from './dxf-import-service';
import { LineObject } from '../scene/line-object';
import { PolylineObject } from '../scene/polyline-object';
import { CircleObject } from '../scene/circle-object';
import { ArcObject } from '../scene/arc-object';
import { TextObject } from '../scene/text-object';

// Динамічний імпорт для WebAssembly модуля
let libredwg: any = null;

async function loadLibreDWG() {
  if (!libredwg) {
    try {
      libredwg = await import('@mlightcad/libredwg-web');
    } catch (error) {
      console.error('Failed to load LibreDWG:', error);
      throw new Error('LibreDWG library not available');
    }
  }
  return libredwg;
}

export class DwgService {
  static async importDwg(
    file: File,
    sceneService: SceneService,
    layerService: LayerService
  ): Promise<void> {
    try {
      const lib = await loadLibreDWG();
      const arrayBuffer = await file.arrayBuffer();
      const dwg = lib.readDWG(arrayBuffer);

      if (!dwg || !dwg.entities) {
        throw new Error('Invalid DWG file or no entities found');
      }

      // Парсинг entities
      for (const entity of dwg.entities) {
        let sceneObject: any = null;

        switch (entity.type) {
          case 'LINE':
            sceneObject = new LineObject(
              sceneService.getNextId(),
              { x: entity.start.x, y: entity.start.y },
              { x: entity.end.x, y: entity.end.y }
            );
            break;

          case 'POLYLINE':
          case 'LWPOLYLINE':
            const points = entity.vertices.map((v: any) => ({ x: v.x, y: v.y }));
            sceneObject = new PolylineObject(sceneService.getNextId(), points, entity.closed || false);
            break;

          case 'CIRCLE':
            sceneObject = new CircleObject(
              sceneService.getNextId(),
              { x: entity.center.x, y: entity.center.y },
              entity.radius
            );
            break;

          case 'ARC':
            sceneObject = new ArcObject(
              sceneService.getNextId(),
              { x: entity.center.x, y: entity.center.y },
              entity.radius,
              entity.startAngle,
              entity.endAngle
            );
            break;

          case 'TEXT':
          case 'MTEXT':
            sceneObject = new TextObject(
              sceneService.getNextId(),
              entity.position.x,
              entity.position.y,
              entity.text,
              'Standard'
            );
            (sceneObject as any).height = entity.height || 10;
            break;

          default:
            console.warn(`Unsupported entity type: ${entity.type}`);
            continue;
        }

        if (sceneObject) {
          // Встановлення шару
          if (entity.layer) {
            (sceneObject as any).layerName = entity.layer;
            // Створити шар якщо не існує
            if (!layerService.getLayer(entity.layer)) {
              layerService.addLayer(entity.layer);
            }
          }

          // Встановлення кольору
          if (entity.color) {
            (sceneObject as any).color = entity.color;
          }

          sceneService.add(sceneObject);
        }
      }

      console.log(`Imported ${dwg.entities.length} entities from DWG`);
    } catch (error) {
      console.error('DWG import failed:', error);
      throw new Error(`Failed to import DWG: ${error.message}`);
    }
  }

  static async exportDwg(sceneService: SceneService, layerService: LayerService): Promise<ArrayBuffer> {
    try {
      const lib = await loadLibreDWG();

      // Створення DWG структури
      const dwgData = {
        header: {
          version: 'AC1015', // R2010
          units: 'Millimeters'
        },
        entities: [] as any[]
      };

      // Конвертація scene objects в DWG entities
      for (const obj of sceneService.objects) {
        let entity: any = null;

        if (obj instanceof LineObject) {
          entity = {
            type: 'LINE',
            start: { x: obj.start.x, y: obj.start.y },
            end: { x: obj.end.x, y: obj.end.y }
          };
        } else if (obj instanceof PolylineObject) {
          entity = {
            type: 'LWPOLYLINE',
            vertices: obj.points,
            closed: obj.isClosed
          };
        } else if (obj instanceof CircleObject) {
          entity = {
            type: 'CIRCLE',
            center: { x: obj.center.x, y: obj.center.y },
            radius: obj.radius
          };
        } else if (obj instanceof ArcObject) {
          entity = {
            type: 'ARC',
            center: { x: obj.center.x, y: obj.center.y },
            radius: obj.radius,
            startAngle: obj.startAngle,
            endAngle: obj.endAngle
          };
        } else if (obj instanceof TextObject) {
          entity = {
            type: 'TEXT',
            position: { x: obj.x, y: obj.y },
            text: obj.text,
            height: obj.height
          };
        }

        if (entity) {
          // Додавання шару та кольору
          entity.layer = (obj as any).layerName || '0';
          entity.color = (obj as any).color || 7; // White by default

          dwgData.entities.push(entity);
        }
      }

      // Створення DWG файлу
      const dwgBuffer = lib.writeDWG(dwgData);
      return dwgBuffer;
    } catch (error) {
      console.error('DWG export failed:', error);
      throw new Error(`Failed to export DWG: ${error.message}`);
    }
  }

  static validateDwgVersion(content: string): { isValid: boolean; version: string; errors: string[] } {
    // Базова перевірка версії DWG (AC1015 для R2010+)
    const errors: string[] = [];
    let version = 'Unknown';

    if (!content || content.length < 6) {
      errors.push('Файл занадто малий для DWG');
      return { isValid: false, version, errors };
    }

    // Перевірка header (бінарний формат)
    const header = content.slice(0, 6);
    if (header === 'AC1015') {
      version = 'R2010';
    } else if (header === 'AC1018') {
      version = 'R2013';
    } else if (header === 'AC1021') {
      version = 'R2018';
    } else if (header === 'AC1024') {
      version = 'R2021';
    } else if (header === 'AC1027') {
      version = 'R2024';
    } else {
      errors.push('Невідома або непідтримувана версія DWG');
    }

    return { isValid: errors.length === 0, version, errors };
  }
}
