/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { Point } from "./scene/point";
import { SceneObject } from "./scene/scene-object";

export enum GripType {
    MOVE,       // Square, moves the whole object
    STRETCH,    // Triangle, modifies a vertex/point or scales
    ROTATE,     // Circle, rotates the object
    SCALE       // Square, scales the object by reference
}

// Defines a command that can be initiated from a grip's context menu
// FIX: Add 'STRETCH' to GripAction to support stretch operations.
export type GripAction = 'MOVE' | 'ROTATE' | 'SCALE' | 'STRETCH' | 'ROTATE_BY_REF' | 'SCALE_BY_REF';

export interface Grip {
    object: SceneObject;
    type: GripType;
    point: Point;
    // Metadata for specific actions
    metadata?: {
        // For walls/polylines, which point index
        pointIndex?: number;
        // For rotation/scaling, the center point
        center?: Point;
        // For reference-based actions
        isReference?: boolean;
        // Other custom data
        [key: string]: any;
    };
}
