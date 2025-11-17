import { App } from '../app';
import { SceneObject } from '../scene/scene-object';
import { ExtrudeObject } from '../scene/extrude-object';
import { RevolveObject } from '../scene/revolve-object';
import { PolylineObject } from '../scene/polyline-object';

export class StlExportService {
  static exportStl(objects: SceneObject[], app: App): string {
    const triangles: string[] = [];

    for (const obj of objects) {
      if (obj instanceof ExtrudeObject) {
        triangles.push(...this.triangulateExtrude(obj, app));
      } else if (obj instanceof RevolveObject) {
        triangles.push(...this.triangulateRevolve(obj, app));
      }
      // Додати інші 3D-об'єкти за потребою
    }

    const stlContent = [
      'solid exported',
      ...triangles,
      'endsolid exported'
    ].join('\n');

    return stlContent;
  }

  private static triangulateExtrude(extrude: ExtrudeObject, app: App): string[] {
    // Спрощена тріангуляція для екструдації
    const triangles: string[] = [];
    const height = extrude.height;

    // Отримуємо точки з екструдації (спрощено, використовуючи mesh якщо можливо)
    const mesh = extrude.getOrCreateMesh(app);
    if (mesh && mesh.geometry) {
      // Спрощена тріангуляція з THREE.js геометрії
      const geometry = mesh.geometry;
      const positions = geometry.attributes.position.array;
      const indices = geometry.index ? geometry.index.array : null;

      if (indices) {
        for (let i = 0; i < indices.length; i += 3) {
          const i1 = indices[i] * 3;
          const i2 = indices[i + 1] * 3;
          const i3 = indices[i + 2] * 3;
          const p1 = { x: positions[i1], y: positions[i1 + 1], z: positions[i1 + 2] };
          const p2 = { x: positions[i2], y: positions[i2 + 1], z: positions[i2 + 2] };
          const p3 = { x: positions[i3], y: positions[i3 + 1], z: positions[i3 + 2] };
          triangles.push(this.createTriangle(p1, p2, p3));
        }
      }
    }

    return triangles;
  }

  private static triangulateRevolve(revolve: RevolveObject, app: App): string[] {
    // Спрощена тріангуляція для обертання
    const triangles: string[] = [];

    // Отримуємо точки з revolve (спрощено, використовуючи mesh якщо можливо)
    const mesh = revolve.getOrCreateMesh(app);
    if (mesh && mesh.geometry) {
      // Спрощена тріангуляція з THREE.js геометрії
      const geometry = mesh.geometry;
      const positions = geometry.attributes.position.array;
      const indices = geometry.index ? geometry.index.array : null;

      if (indices) {
        for (let i = 0; i < indices.length; i += 3) {
          const i1 = indices[i] * 3;
          const i2 = indices[i + 1] * 3;
          const i3 = indices[i + 2] * 3;
          const p1 = { x: positions[i1], y: positions[i1 + 1], z: positions[i1 + 2] };
          const p2 = { x: positions[i2], y: positions[i2 + 1], z: positions[i2 + 2] };
          const p3 = { x: positions[i3], y: positions[i3 + 1], z: positions[i3 + 2] };
          triangles.push(this.createTriangle(p1, p2, p3));
        }
      }
    }

    return triangles;
  }

  private static rotatePoint(point: { x: number; y: number }, angle: number): { x: number; y: number; z: number } {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
      x: point.x * cos,
      y: point.x * sin,
      z: point.y
    };
  }

  private static triangulatePolygon(points: { x: number; y: number; z: number }[]): string[] {
    const triangles: string[] = [];
    // Простий фан-тріангулятор для опуклих полігонів
    for (let i = 1; i < points.length - 1; i++) {
      triangles.push(this.createTriangle(points[0], points[i], points[i + 1]));
    }
    return triangles;
  }

  private static createTriangle(p1: { x: number; y: number; z?: number }, p2: { x: number; y: number; z?: number }, p3: { x: number; y: number; z?: number }): string {
    const z1 = p1.z || 0;
    const z2 = p2.z || 0;
    const z3 = p3.z || 0;

    // Обчислення нормалі (спрощено)
    const normal = { x: 0, y: 0, z: 1 };

    return `  facet normal ${normal.x} ${normal.y} ${normal.z}
    outer loop
      vertex ${p1.x} ${p1.y} ${z1}
      vertex ${p2.x} ${p2.y} ${z2}
      vertex ${p3.x} ${p3.y} ${z3}
    endloop
  endfacet`;
  }
}
