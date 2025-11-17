/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { App } from './src/app';
import { runGeometryTests } from './src/tests/geometry.test';
import { runE2ETests } from './src/tests/e2e.test';
import { printTestSummary } from './src/utils/test-runner';
import { runPropertiesControllerTests } from './src/tests/properties-controller.test';
import { runGeometryServiceTests } from './src/tests/geometry-service.test';
import { loadUIComponents } from './src/ui-loader';
import { LogService } from './src/services/logger';

/**
 * Головна асинхронна функція, яка ініціалізує додаток.
 * Завантажує компоненти інтерфейсу, знаходить canvas та створює екземпляр класу App.
 * Також запускає набір тестів у режимі розробки.
 */
async function main() {
    // Load all the separate HTML panels into the main index.html file.
    await loadUIComponents();

    // Find the canvas element and initialize the application
    const canvas = document.getElementById('app-canvas') as HTMLCanvasElement;
    if (canvas) {
        // The App class constructor handles all setup and initialization.
        const app = new App(canvas);

        // --- Run Tests in Development ---
        console.log('--- Running Unit Tests ---');
        runGeometryTests();
        runE2ETests(app); // This test requires an app instance
        runPropertiesControllerTests(app); // This test requires an app instance
        runGeometryServiceTests(); // This test verifies JSTS integration
        printTestSummary();
        // -----------------------------

    } else {
        LogService.error('Fatal Error: Canvas element with ID "app-canvas" not found.');
        // Optionally, display a user-friendly error message in the DOM.
        document.body.innerHTML = '<div style="color: white; text-align: center; padding-top: 50px;">' +
            '<h1>Application Error</h1>' +
            '<p>Could not find the required canvas element to start the application.</p>' +
            '</div>';
    }
}

// Global error handler to catch any unhandled exceptions during initialization or runtime.
try {
    main();
} catch (error) {
    LogService.error('An unhandled error occurred during application startup.', error);
    // Display a user-friendly error message in the DOM as a last resort.
    document.body.innerHTML = '<div style="color: white; text-align: center; padding-top: 50px;">' +
        '<h1>Fatal Application Error</h1>' +
        '<p>A critical error occurred and the application cannot continue. Please check the logs.</p>' +
        '</div>';
}
