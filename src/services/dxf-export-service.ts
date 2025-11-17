import DxfWriter from 'dxf-writer';
import { SceneObject } from '../scene/scene-object';
import { PolylineObject } from '../scene/polyline-object';
import { CircleObject } from '../scene/circle-object';
import { ArcObject } from '../scene/arc-object';
import { TextObject } from '../scene/text-object';

export class DxfExportService {
  static exportDxf(objects: SceneObject[]): string {
    const dxf = new DxfWriter();

    for (const obj of objects) {
      if (obj instanceof PolylineObject) {
        this.addPolyline(dxf, obj);
      } else if (obj instanceof CircleObject) {
        this.addCircle(dxf, obj);
      } else if (obj instanceof ArcObject) {
        this.addArc(dxf, obj);
      } else if (obj instanceof TextObject) {
        this.addText(dxf, obj);
      }
      // Додати інші типи за потребою
    }

    return dxf.toDxfString();
  }

  private static addPolyline(dxf: any, polyline: PolylineObject) {
    if (polyline.points.length === 2) {
      // LINE
      dxf.addLine(
        polyline.points[0].x, polyline.points[0].y, 0,
        polyline.points[1].x, polyline.points[1].y, 0
      );
    } else {
      // POLYLINE
      const vertices = polyline.points.map(p => [p.x, p.y, 0]);
      dxf.addPolyline(vertices, polyline.isClosed);
    }
  }

  private static addCircle(dxf: any, circle: CircleObject) {
    dxf.addCircle(circle.center.x, circle.center.y, 0, circle.radius);
  }

  private static addArc(dxf: any, arc: ArcObject) {
    dxf.addArc(
      arc.center.x, arc.center.y, 0,
      arc.radius,
      arc.startAngle * 180 / Math.PI,
      arc.endAngle * 180 / Math.PI
    );
  }

  private static addText(dxf: any, text: TextObject) {
    dxf.addText(text.x, text.y, 0, text.height, text.text);
  }
}
