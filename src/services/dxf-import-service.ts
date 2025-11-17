import DxfParser from 'dxf-parser';
import { SceneObject } from '../scene/scene-object';
import { PolylineObject } from '../scene/polyline-object';
import { CircleObject } from '../scene/circle-object';
import { ArcObject } from '../scene/arc-object';
import { TextObject } from '../scene/text-object';

export class DxfImportService {
  static async importDxf(content: string): Promise<SceneObject[]> {
    const parser = new DxfParser();
    const dxf = parser.parseSync(content);
    const objects: SceneObject[] = [];

    if (dxf.entities) {
      for (const entity of dxf.entities) {
        switch (entity.type) {
          case 'LINE':
            objects.push(this.createLine(entity));
            break;
          case 'POLYLINE':
          case 'LWPOLYLINE':
            objects.push(this.createPolyline(entity));
            break;
          case 'CIRCLE':
            objects.push(this.createCircle(entity));
            break;
          case 'ARC':
            objects.push(this.createArc(entity));
            break;
          case 'TEXT':
            objects.push(this.createText(entity));
            break;
          // Додати інші типи за потребою
        }
      }
    }

    return objects;
  }

  private static createLine(entity: any): PolylineObject {
    const points = [
      { x: entity.vertices[0].x, y: entity.vertices[0].y },
      { x: entity.vertices[1].x, y: entity.vertices[1].y }
    ];
    return new PolylineObject(0, points, false);
  }

  private static createPolyline(entity: any): PolylineObject {
    const points = entity.vertices.map((v: any) => ({ x: v.x, y: v.y }));
    return new PolylineObject(0, points, false);
  }

  private static createCircle(entity: any): CircleObject {
    return new CircleObject(0, { x: entity.x, y: entity.y }, entity.r);
  }

  private static createArc(entity: any): ArcObject {
    return new ArcObject(0, { x: entity.x, y: entity.y }, entity.r, entity.startAngle, entity.endAngle, false);
  }

  private static createText(entity: any): TextObject {
    return new TextObject(0, entity.startPoint.x, entity.startPoint.y, entity.text);
  }
}
