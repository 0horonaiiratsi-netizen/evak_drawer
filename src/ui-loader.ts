/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { LogService } from "./services/logger";

// This function dynamically loads HTML content for various UI panels from separate files.
// This approach helps in organizing the UI components and keeps the main index.html file clean.
export async function loadUIComponents() {
    const primaryComponents = [
        { id: 'workspace-selection-modal', path: './panels/workspace-selection-modal.html' },
        { id: 'symbol-palette', path: './panels/symbol-palette.html' },
        { id: 'topo-symbol-palette', path: './panels/topo-symbol-palette.html' },
        { id: 'primary-toolbar', path: './panels/primary-toolbar.html' },
        { id: 'sketch-toolbar', path: './panels/sketch-toolbar.html' },
        { id: 'block-editor-toolbar', path: './panels/block-editor-toolbar.html' },
        { id: 'drawing-toolbar', path: './panels/drawing-toolbar.html' },
        { id: 'modification-toolbar', path: './panels/modification-toolbar.html' },
        { id: 'annotations-toolbar', path: './panels/annotations-toolbar.html' },
        { id: 'precision-toolbar', path: './panels/precision-toolbar.html' },
        { id: 'object-snap-toolbar', path: './panels/object-snap-toolbar.html' },
        { id: 'file-toolbar', path: './panels/file-toolbar.html' },
        { id: 'stairs-tool-options', path: './panels/stairs-tool-options.html' },
        { id: 'window-container', path: './panels/window-container.html' },
        { id: 'modal-backdrop', path: './panels/modals.html' },
        { id: 'status-bar', path: './panels/status-bar.html' },
        { id: 'command-line', path: './panels/command-line.html' },
    ];

    const secondaryComponents = [
        { id: 'log-viewer-panel-content', path: './panels/log-viewer.html'},
        { id: 'feature-tree-panel-content', path: './panels/feature-tree-panel.html'},
    ];

    const loadGroup = (components: {id: string, path: string}[]) => {
        return components.map(async (component) => {
            const element = document.getElementById(component.id);
            if (element) {
                try {
                    const response = await fetch(component.path);
                    if (!response.ok) {
                        throw new Error(`Failed to fetch ${component.path}: ${response.statusText}`);
                    }
                    element.innerHTML = await response.text();
                } catch (error) {
                    LogService.error(`Error loading UI component for #${component.id}:`, error);
                    element.innerHTML = `<p style="color:red">Error loading ${component.id}</p>`;
                }
            } else {
                 LogService.warn(`UI Loader: Element with ID #${component.id} not found in the DOM during its load phase.`);
            }
        });
    };
    
    // Load all primary components that don't have dependencies on other loaded components
    await Promise.all(loadGroup(primaryComponents));
    
    // Load secondary components that depend on primary ones (e.g., content for a window)
    await Promise.all(loadGroup(secondaryComponents));
}
