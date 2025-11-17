/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from "../app";
import { ToolType } from "./tool";
import { SelectedSegment, TwoSegmentConstraintTool } from "./constraint-tool-base";

export class PerpendicularConstraintTool extends TwoSegmentConstraintTool {
    constructor(app: App) {
        super(app, ToolType.PERPENDICULAR_CONSTRAINT);
    }
    
    applyConstraint(segment1: SelectedSegment, segment2: SelectedSegment): void {
        if (!this.app.sketchSolver) return;
        
        // The first selected segment (segment1) acts as the reference.
        // The second selected segment (segment2) will be constrained to be perpendicular to it.
        this.app.sketchSolver.addPerpendicularConstraint(segment2.p1, segment2.p2, segment1.p1, segment1.p2);
        this.app.sketchSolver.solve();
        this.app.draw();
    }
}