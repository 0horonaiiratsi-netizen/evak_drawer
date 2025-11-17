/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { suite, test, assert, assertEqual, assertAlmostEqual } from '../utils/test-runner';
import { App } from '../app';
import { Wall, WallType } from '../scene/wall';
import { SymbolObject, SymbolType } from '../scene/symbol-object';
import { TextObject } from '../scene/text-object';
import { EvacuationPath } from '../scene/evacuation-path';
import { Layer } from '../layer';

export function runE2ETests(app: App) {
    suite('End-to-End Workflow', () => {

        test('should create, save, and load a project with layers successfully', () => {
            app.newProject();
            app.layerService.clear();
            
            app.layerService.addLayer('Стіни');
            const wallsLayerId = app.layerService.activeLayerId;
            app.layerService.addLayer('Символи');
            const symbolsLayerId = app.layerService.activeLayerId;
            app.layerService.addLayer('Текст та Шляхи');
            const textLayerId = app.layerService.activeLayerId;

            app.layerService.setActiveLayerId(wallsLayerId);
            app.addSceneObject(new Wall(app.sceneService.getNextId(), { x: 100, y: 100 }, { x: 300, y: 100 }, WallType.INTERIOR));
            
            app.layerService.setActiveLayerId(symbolsLayerId);
            app.addSceneObject(new SymbolObject(app.sceneService.getNextId(), 200, 150, SymbolType.FIRE_EXTINGUISHER));

            app.layerService.setActiveLayerId(textLayerId);
            app.addSceneObject(new TextObject(app.sceneService.getNextId(), 50, 50, 'Test Text'));
            app.addSceneObject(new EvacuationPath(app.sceneService.getNextId(), [{x: 50, y: 200}, {x: 150, y: 200}]));
            
            const jsonString = app.projectStateService.serialize();
            
            app.newProject();
            app.projectStateService.load(jsonString);

            assertEqual(app.sceneService.objects.length, 4, 'Should have 4 objects after loading');
            assertEqual(app.layerService.layers.length, 3, 'Should have 3 layers after loading');
            const loadedWall = app.sceneService.objects.find(obj => obj instanceof Wall) as Wall;
            assert(app.layerService.getLayerForObject(loadedWall.id)?.name === 'Стіни', 'Wall should be on the correct layer');

            app.newProject();
        });

        test('should handle undo and redo operations correctly', () => {
            app.newProject();

            assertEqual(app.sceneService.objects.length, 0, 'Scene is initially empty');
            assert(!app.projectStateService.canUndo(), 'Cannot undo initially');
            assert(!app.projectStateService.canRedo(), 'Cannot redo initially');

            const symbol = new SymbolObject(app.sceneService.getNextId(), 100, 100, SymbolType.EXIT);
            app.addSceneObject(symbol);
            const originalPosition = { x: symbol.x, y: symbol.y };

            assertEqual(app.sceneService.objects.length, 1, 'Scene has one object after adding');
            assert(app.projectStateService.canUndo(), 'Can undo after adding object');

            app.selectionService.setSingle(symbol.id);
            symbol.move(50, 50, app);
            app.projectStateService.commit("Move Symbol");
            const movedPosition = { x: symbol.x, y: symbol.y };

            assertEqual(symbol.x, 150, 'Symbol x position is updated');
            
            app.projectStateService.undo();
            const symbolAfterUndo = app.sceneService.findById(symbol.id) as SymbolObject;
            assertEqual(app.sceneService.objects.length, 1, 'Still one object after undoing move');
            assertAlmostEqual(symbolAfterUndo.x, originalPosition.x, 'Symbol x is back to original');
            assertAlmostEqual(symbolAfterUndo.y, originalPosition.y, 'Symbol y is back to original');
            assert(app.projectStateService.canRedo(), 'Can redo after undoing');

            app.projectStateService.redo();
            const symbolAfterRedo = app.sceneService.findById(symbol.id) as SymbolObject;
            assertEqual(app.sceneService.objects.length, 1, 'Still one object after redoing move');
            assertAlmostEqual(symbolAfterRedo.x, movedPosition.x, 'Symbol x is back to moved position');
            assertAlmostEqual(symbolAfterRedo.y, movedPosition.y, 'Symbol y is back to moved position');
            assert(!app.projectStateService.canRedo(), 'Cannot redo again after redoing');
            
            app.projectStateService.undo(); // Undo move
            app.projectStateService.undo(); // Undo add
            assertEqual(app.sceneService.objects.length, 0, 'Scene is empty after undoing add');
            assert(!app.projectStateService.canUndo(), 'Cannot undo after undoing all actions');
            
            app.projectStateService.redo(); // Redo add
            assertEqual(app.sceneService.objects.length, 1, 'Scene has one object after redoing add');
            app.projectStateService.redo(); // Redo move
            const finalSymbol = app.sceneService.findById(symbol.id) as SymbolObject;
            assertAlmostEqual(finalSymbol.x, movedPosition.x, 'Symbol is in moved position after all redos');

            app.newProject();
        });
    });
}