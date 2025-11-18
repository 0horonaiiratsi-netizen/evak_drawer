/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { Mate } from "../scene/assembly-object";
import { Point } from "../scene/point";

export class MateService {
    private mates: Mate[] = [];

    addMate(mate: Mate) {
        this.mates.push(mate);
    }

    removeMate(id: number) {
        const index = this.mates.findIndex(m => m.id === id);
        if (index > -1) {
            this.mates.splice(index, 1);
        }
    }

    getMates(): Mate[] {
        return this.mates;
    }

    // Apply constraints for rigid mate
    applyRigidMate(mate: Mate, componentA: any, componentB: any) {
        // For rigid, align origins
        const dx = mate.originB.x - mate.originA.x;
        const dy = mate.originB.y - mate.originA.y;
        componentB.move(dx, dy);
    }

    // Apply constraints for revolute mate (rotation around axis)
    applyRevoluteMate(mate: Mate, componentA: any, componentB: any, angle: number) {
        // Rotate componentB around originA by angle
        componentB.rotate(angle, mate.originA);
    }

    // Apply constraints for slider mate (translation along axis)
    applySliderMate(mate: Mate, componentA: any, componentB: any, distance: number) {
        // Move componentB along the axis defined by origins
        const axis = { x: mate.originB.x - mate.originA.x, y: mate.originB.y - mate.originA.y };
        const length = Math.sqrt(axis.x ** 2 + axis.y ** 2);
        if (length > 0) {
            const unitX = axis.x / length;
            const unitY = axis.y / length;
            componentB.move(distance * unitX, distance * unitY);
        }
    }

    // Validate mate constraints
    validateMate(mate: Mate): boolean {
        // Basic validation: origins should be defined
        return mate.originA && mate.originB && ['rigid', 'revolute', 'slider'].includes(mate.type);
    }
}
