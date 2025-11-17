/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { Point } from "./point";
import { SceneObject } from "./scene-object";
import { objectFactory } from "./factory";
import { App } from "../app";

/**
 * Represents the definition of a block, which is a template for creating block references.
 * This is not a scene object itself but a container for them.
 */
export class BlockDefinition {
    name: string;
    basePoint: Point;
    objects: SceneObject[];

    /**
     * @param name The unique name of the block definition.
     * @param basePoint The origin point of the block's internal coordinate system.
     * @param objects An array of SceneObjects that make up the block's geometry.
     */
    constructor(name: string, basePoint: Point, objects: SceneObject[]) {
        this.name = name;
        this.basePoint = basePoint;
        this.objects = objects;
    }

    /**
     * A static factory method for creating a BlockDefinition from existing scene objects.
     * This method clones the provided objects and makes their coordinates relative to the base point.
     * @param name The name for the new block definition.
     * @param basePoint The base point for the block.
     * @param objects The scene objects to include in the block.
     * @returns A new BlockDefinition instance.
     */
    static fromSceneObjects(name: string, basePoint: Point, objects: SceneObject[], app: App): BlockDefinition {
        const relativeObjects = objects.map(obj => {
            // Use getNextObjectId for cloning to ensure uniqueness if the block is exploded later.
            const newObj = obj.clone(app.sceneService.getNextId());
            newObj.move(-basePoint.x, -basePoint.y);
            return newObj;
        });
        return new BlockDefinition(name, basePoint, relativeObjects);
    }
    
    /**
     * Serializes the block definition to a JSON object.
     * @returns A plain object suitable for JSON.stringify.
     */
    toJSON() {
        return {
            name: this.name,
            basePoint: this.basePoint,
            objects: this.objects.map(obj => obj.toJSON()),
        };
    }

    /**
     * Creates a BlockDefinition instance from a JSON object.
     * @param data The JSON data.
     * @param app The main application instance.
     * @returns A new BlockDefinition.
     */
    static fromJSON(data: any, app: App): BlockDefinition {
        const objects = data.objects.map((objData: any) => {
            const factory = objectFactory[objData.type as keyof typeof objectFactory];
            return factory ? factory(objData, app) : null;
        }).filter((obj: SceneObject | null): obj is SceneObject => obj !== null);
        
        return new BlockDefinition(data.name, data.basePoint, objects);
    }
}