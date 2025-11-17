
import DxfWriter from 'dxf-writer';
import { SceneService } from './scene.service';
import { LayerService } from './layer.service';
import { PolylineObject } from '../scene/polyline-object';
import { LineObject } from '../scene/line-object';
import { CircleObject } from '../scene/circle-object';
import { ArcObject } from '../scene/arc-object';
import { SplineObject } from '../scene/spline-object';
import { TextObject } from '../scene/text-object';
import { InsertObject } from '../scene/insert-object';
import { SceneObject } from '../scene/scene-object';
import { BlockDefinition } from '../scene/block-definition';

export class DxfExportService {
  public static export(sceneService: SceneService, layerService: LayerService): string {
    const writer = new DxfWriter();
    this.exportLayers(writer, layerService);
    this.exportBlocks(writer, sceneService);
    this.exportEntities(writer, sceneService);
    return writer.toDxfString();
  }

  public static exportDxf(objects: any[]): string {
    const writer = new DxfWriter();
    for (const obj of objects) {
      const entity = this.mapSceneObjectToDxfEntity(obj);
      if (entity) {
        writer.addEntity(entity);
      }
    }
    return writer.toDxfString();
  }

  private static exportLayers(writer: DxfWriter, layerService: LayerService): void {
    for (const layer of layerService.layers) {
      writer.addLayer(layer.name, DxfWriter.ACI.WHITE, 'CONTINUOUS');
    }
  }

  private static exportBlocks(writer: DxfWriter, sceneService: SceneService): void {
    for (const block of sceneService.getBlockDefinitions()) {
      writer.addBlock(
        block.name,
        [block.basePoint.x, block.basePoint.y, 0],
        block.objects.map((obj) => this.mapSceneObjectToDxfEntity(obj)).filter(e => e !== null)
      );
    }
  }

  private static exportEntities(writer: DxfWriter, sceneService: SceneService): void {
    for (const obj of sceneService.objects) {
      const entity = this.mapSceneObjectToDxfEntity(obj);
      if (entity) {
        writer.addEntity(entity);
      }
    }
  }

  private static mapSceneObjectToDxfEntity(obj: SceneObject): any {
    let entity: any = null;
    if (obj instanceof LineObject) {
      entity = {
        type: 'LINE',
        start: [obj.start.x, obj.start.y, 0],
        end: [obj.end.x, obj.end.y, 0],
        layer: obj.layer?.name || '0',
      };
    } else if (obj instanceof PolylineObject) {
      entity = {
        type: 'POLYLINE',
        vertices: obj.points.map((p) => [p.x, p.y, 0]),
        closed: obj.isClosed,
        layer: obj.layer?.name || '0',
      };
    } else if (obj instanceof CircleObject) {
      entity = {
        type: 'CIRCLE',
        center: [obj.center.x, obj.center.y, 0],
        radius: obj.radius,
        layer: obj.layer?.name || '0',
      };
    } else if (obj instanceof ArcObject) {
      entity = {
        type: 'ARC',
        center: [obj.center.x, obj.center.y, 0],
        radius: obj.radius,
        startAngle: obj.startAngle,
        endAngle: obj.endAngle,
        layer: obj.layer?.name || '0',
      };
    } else if (obj instanceof SplineObject) {
      entity = {
        type: 'SPLINE',
        controlPoints: obj.controlPoints.map((p) => [p.x, p.y, 0]),
        knots: obj.knots,
        degree: obj.degree,
        layer: obj.layer?.name || '0',
      };
    } else if (obj instanceof TextObject) {
      entity = {
        type: 'TEXT',
        text: obj.text,
        insertionPoint: [obj.x, obj.y, 0],
        textHeight: obj.height,
        rotation: obj.angle,
        layer: obj.layer?.name || '0',
      };
    } else if (obj instanceof InsertObject) {
      entity = {
        type: 'INSERT',
        blockName: obj.blockName,
        insertionPoint: [obj.position.x, obj.position.y, 0],
        scale: [obj.insertScale.x, obj.insertScale.y, 1],
        rotation: obj.rotation,
        layer: obj.layer?.name || '0',
      };
    }
    return entity;
  }
}
