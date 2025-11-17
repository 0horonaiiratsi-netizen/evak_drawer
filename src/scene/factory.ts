/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { App } from "../app";
import { BuildingWindow } from "./window";
import { Door } from "./door";
import { EvacuationPath } from "./evacuation-path";
import { PdfUnderlay } from "./pdf-underlay";
import { SceneObject } from "./scene-object";
import { StairsObject } from "./stairs-object";
import { SymbolObject } from "./symbol-object";
import { TextObject } from "./text-object";
import { Wall } from "./wall";
import { GroupObject } from "./group-object";
import { PolylineObject } from "./polyline-object";
import { CircleObject } from "./circle-object";
import { ArcObject } from "./arc-object";
import { HatchObject } from "./hatch-object";
import { EmergencyEvacuationPath } from "./emergency-evacuation-path";
import { LinearDimensionObject } from "./linear-dimension-object";
import { AlignedDimensionObject } from "./aligned-dimension-object";
import { SketchObject } from "./sketch-object";
import { BlockReference } from "./block-reference";
import { ExtrudeObject } from "./extrude-object";
import { RevolveObject } from "./revolve-object";
import { CutObject } from "./cut-object";
import { SweepObject } from "./sweep-object";
import { LoftObject } from "./loft-object";

// A map to connect type strings to their respective factory methods for deserialization
export const objectFactory: { [key: string]: (data: any, app: App) => SceneObject } = {
    'wall': (data) => Wall.fromJSON(data),
    'door': (data) => Door.fromJSON(data),
    'window': (data) => BuildingWindow.fromJSON(data),
    'symbol': (data) => SymbolObject.fromJSON(data),
    'stairs': (data) => StairsObject.fromJSON(data),
    'text': (data) => TextObject.fromJSON(data),
    'pdfUnderlay': (data, app) => PdfUnderlay.fromJSON(data, app),
    'evacuationPath': (data) => EvacuationPath.fromJSON(data),
    'emergencyEvacuationPath': (data) => EmergencyEvacuationPath.fromJSON(data),
    'group': (data, app) => GroupObject.fromJSON(data, app),
    'sketch': (data, app) => SketchObject.fromJSON(data, app),
    'polyline': (data) => PolylineObject.fromJSON(data),
    'circle': (data) => CircleObject.fromJSON(data),
    'arc': (data) => ArcObject.fromJSON(data),
    'hatch': (data) => HatchObject.fromJSON(data),
    'linearDimension': (data, app) => LinearDimensionObject.fromJSON(data, app),
    'alignedDimension': (data, app) => AlignedDimensionObject.fromJSON(data, app),
    'blockReference': (data, app) => BlockReference.fromJSON(data, app),
    'extrudeObject': (data, app) => ExtrudeObject.fromJSON(data, app),
    'revolveObject': (data, app) => RevolveObject.fromJSON(data, app),
    'cutObject': (data, app) => CutObject.fromJSON(data, app),
    'sweepObject': (data, app) => SweepObject.fromJSON(data, app),
    'loftObject': (data, app) => LoftObject.fromJSON(data, app),
};