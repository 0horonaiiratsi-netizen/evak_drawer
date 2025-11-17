/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from '../app';
import { BoundingBox, SceneObject } from './scene-object';
import { Point } from './point';
import { Grip } from '../grips';
import { PolylineObject } from './polyline-object';
import { SketchObject } from './sketch-object';
import { distance } from '../utils/geometry';

declare const THREE: any;

function resamplePolyline(points: Point[], numPoints: number): Point[] {
    if (points.length < 2) return points;

    const totalLength = new PolylineObject(0, points, true).getLength();
    if (totalLength < 1e-6) return points;

    const resampled: Point[] = [];
    const interval = totalLength / numPoints;
    let distanceCovered = 0;
    let segmentIndex = 0;
    let currentPos = { ...points[0] };
    resampled.push(currentPos);

    for (let i = 1; i < numPoints; i++) {
        let distanceNeeded = interval;
        while (distanceNeeded > 0) {
            const p1 = points[segmentIndex];
            const p2 = points[(segmentIndex + 1) % points.length];
            const segmentLength = distance(p1, p2);
            const distanceToSegmentEnd = segmentLength - distance(p1, currentPos);

            if (distanceNeeded <= distanceToSegmentEnd) {
                const ratio = distanceNeeded / segmentLength;
                currentPos = {
                    x: currentPos.x + (p2.x - p1.x) * ratio,
                    y: currentPos.y + (p2.y - p1.y) * ratio,
                };
                distanceNeeded = 0;
            } else {
                distanceNeeded -= distanceToSegmentEnd;
                segmentIndex = (segmentIndex + 1) % points.length;
                currentPos = { ...points[segmentIndex] };
            }
        }
        resampled.push({ ...currentPos });
    }
    return resampled;
}

export class LoftObject implements SceneObject {
    id: number;
    sourceObjectIds: number[];
    isHidden?: boolean;
    private mesh: any | null = null; // THREE.Mesh

    constructor(id: number, sourceObjectIds: number[]) {
        this.id = id;
        this.sourceObjectIds = sourceObjectIds;
    }

    private getSourceShapes(app: App): SceneObject[] {
        // FIX: Use sceneService to access objects.
        return this.sourceObjectIds.map(id => app.sceneService.findById(id)).filter(Boolean) as SceneObject[];
    }
    
    getOrCreateMesh(app: App): any {
        if (this.mesh) return this.mesh;
        
        const sourceShapes = this.getSourceShapes(app);
        if (sourceShapes.length < 2) return null;

        const profiles: Point[][] = sourceShapes.map(shape => {
            if (shape instanceof PolylineObject) return shape.points;
            if (shape instanceof SketchObject) {
                const points: Point[] = [];
                shape.objects.forEach(obj => { if (obj instanceof PolylineObject) points.push(...obj.points) });
                return points;
            }
            return [];
        }).filter(p => p.length > 0);

        if (profiles.length < 2) return null;
        
        const SAMPLE_POINTS = 100;
        const resampledProfiles = profiles.map(p => resamplePolyline(p, SAMPLE_POINTS));
        
        const vertices: number[] = [];
        const geometries: any[] = []; // THREE.BufferGeometry[]

        for (let i = 0; i < resampledProfiles.length - 1; i++) {
            const profile1 = resampledProfiles[i];
            const profile2 = resampledProfiles[i+1];
            
            for (let j = 0; j < SAMPLE_POINTS; j++) {
                const p1 = profile1[j];
                const p2 = profile1[(j + 1) % SAMPLE_POINTS];
                const p3 = profile2[j];
                const p4 = profile2[(j + 1) % SAMPLE_POINTS];
                
                vertices.push(p1.x, p1.y, 0,  p3.x, p3.y, 0,  p2.x, p2.y, 0);
                vertices.push(p2.x, p2.y, 0,  p3.x, p3.y, 0,  p4.x, p4.y, 0);
            }
        }

        const sideGeometry = new THREE.BufferGeometry();
        sideGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        sideGeometry.computeVertexNormals();
        geometries.push(sideGeometry);
        
        // Add caps
        [resampledProfiles[0], resampledProfiles[resampledProfiles.length - 1]].forEach((profile, index) => {
            if (profile.length > 2) {
                const shape = new THREE.Shape(profile.map(p => new THREE.Vector2(p.x, p.y)));
                const capGeom = new THREE.ShapeGeometry(shape);
                geometries.push(capGeom);
            }
        });
        
        const mergedGeometry = THREE.BufferGeometryUtils.mergeBufferGeometries(geometries);
        const material = new THREE.MeshStandardMaterial({ color: 0xcc007a, roughness: 0.5, metalness: 0.1, side: THREE.DoubleSide });
        this.mesh = new THREE.Mesh(mergedGeometry, material);

        return this.mesh;
    }

    // --- SceneObject Interface ---
    draw(ctx: CanvasRenderingContext2D, isSelected: boolean, zoom: number, allVisibleObjects: readonly SceneObject[], app: App): void {
        this.getSourceShapes(app).forEach(obj => obj.draw(ctx, isSelected, zoom, allVisibleObjects, app));
    }
    contains(point: Point, tolerance: number, app: App): boolean {
        return this.getSourceShapes(app).some(obj => obj.contains(point, tolerance, app));
    }
    getBoundingBox(app: App): BoundingBox {
        const bboxes = this.getSourceShapes(app).map(obj => obj.getBoundingBox(app));
        if (bboxes.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
        return {
            minX: Math.min(...bboxes.map(b => b.minX)), minY: Math.min(...bboxes.map(b => b.minY)),
            maxX: Math.max(...bboxes.map(b => b.maxX)), maxY: Math.max(...bboxes.map(b => b.maxY)),
        };
    }
    move(dx: number, dy: number, app: App): void {
        this.getSourceShapes(app).forEach(obj => obj.move(dx, dy, app));
        this.mesh = null;
    }
    rotate(angle: number, center: Point, app: App): void {
        this.getSourceShapes(app).forEach(obj => obj.rotate(angle, center, app));
        this.mesh = null;
    }
    scale(factor: number, center: Point, app: App): void {
        this.getSourceShapes(app).forEach(obj => obj.scale(factor, center, app));
        this.mesh = null;
    }
    clone(newId: number, app: App): SceneObject {
        const newLoft = new LoftObject(newId, [...this.sourceObjectIds]);
        newLoft.isHidden = this.isHidden;
        return newLoft;
    }
    getCenter(app: App): Point {
        const bbox = this.getBoundingBox(app);
        return { x: (bbox.minX + bbox.maxX) / 2, y: (bbox.minY + bbox.maxY) / 2 };
    }
    getSnapPoints(app: App): Point[] {
        return this.getSourceShapes(app).flatMap(obj => obj.getSnapPoints(app));
    }
    getGrips(app: App): Grip[] { return []; }
    
    toJSON(): any {
        return {
            type: 'loftObject',
            id: this.id,
            sourceObjectIds: this.sourceObjectIds,
            isHidden: this.isHidden,
        };
    }
    static fromJSON(data: any, app: App): LoftObject {
        const obj = new LoftObject(data.id, data.sourceObjectIds);
        obj.isHidden = data.isHidden;
        return obj;
    }
}
