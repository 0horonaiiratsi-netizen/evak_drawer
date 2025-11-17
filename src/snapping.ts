/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { Point } from "./scene/point";
import { SceneObject } from "./scene/scene-object";

export enum SnapType {
    ENDPOINT,
    MIDPOINT,
    CENTER,
    INTERSECTION,
    PERPENDICULAR,
    QUADRANT,
    TANGENT,
    NEAREST,
}

export interface SnapResult {
    point: Point;
    snapType: SnapType;
    object?: SceneObject; // The object that was snapped to
}