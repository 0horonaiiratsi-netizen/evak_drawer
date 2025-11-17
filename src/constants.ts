/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// --- Canvas & Grid ---
export const GRID_SIZE_MAJOR = 100;
export const GRID_SIZE_MINOR = 20;

// --- Zoom & Pan ---
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 10;
export const ZOOM_SENSITIVITY = 0.001;

// --- Snapping & Tolerance ---
export const ANGLE_SNAP_INCREMENT = Math.PI / 12; // 15 degrees
export const SELECTION_TOLERANCE = 5; // in screen pixels
export const WALL_MOUNT_SNAP_DISTANCE = 20; // in screen pixels
export const OBJECT_SNAP_DISTANCE = 15; // in screen pixels