/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from './app';
import { I18nService } from './i18n';

type Workspace = 'evacuation' | 'classic';

export class WorkspaceManager {
    private app: App;
    private i18n: I18nService;
    private currentWorkspace: Workspace | null = null;
    private elementConfig: { selector: string, workspaces: Workspace[] }[];

    constructor(app: App) {
        this.app = app;
        this.i18n = app.i18n;

        // Define which UI elements belong to which workspaces
        this.elementConfig = [
            // Evacuation-specific tools & UI
            { selector: '#symbol-palette', workspaces: ['evacuation'] },
            { selector: '#evacuation-path-tool', workspaces: ['evacuation'] },
            { selector: '#emergency-evacuation-path-tool', workspaces: ['evacuation'] },
            { selector: '#wall-exterior-tool', workspaces: ['evacuation'] },
            { selector: '#wall-interior-tool', workspaces: ['evacuation'] },
            { selector: '#wall-partition-tool', workspaces: ['evacuation'] },
            { selector: '#evacuation-drawing-divider', workspaces: ['evacuation'] },
            { selector: '#door-tool', workspaces: ['evacuation'] },
            { selector: '#window-tool', workspaces: ['evacuation'] },
            { selector: '#stairs-tool', workspaces: ['evacuation'] },
            { selector: '#stairs-tool-options', workspaces: ['evacuation'] },
            { selector: '#text-tool', workspaces: ['evacuation'] },

            // Classic-specific tools
            { selector: '#modification-tools-toggle', workspaces: ['classic'] },
            { selector: '#modification-toolbar', workspaces: ['classic'] },
            { selector: '#topo-symbol-palette', workspaces: ['classic'] },

            // Shared elements (no need to list them, as we default to visible)
        ];
    }

    public switchTo(workspace: Workspace): void {
        this.currentWorkspace = workspace;
        console.log(`Switching to workspace: ${workspace}`);

        // Add a data attribute to the body for CSS scoping
        document.body.dataset.workspace = workspace;

        // Update UI elements based on the new workspace
        this.elementConfig.forEach(config => {
            const element = document.querySelector<HTMLElement>(config.selector);
            if (element) {
                const shouldBeVisible = config.workspaces.includes(workspace);
                element.style.display = shouldBeVisible ? '' : 'none'; // Use '' to reset to CSS default
            } else {
                console.warn(`WorkspaceManager: Element with selector "${config.selector}" not found.`);
            }
        });

        // Update the main toolbar title
        const toolbarTitle = document.querySelector<HTMLElement>('#primary-toolbar .toolbar-title');
        if (toolbarTitle) {
            if (workspace === 'classic') {
                toolbarTitle.setAttribute('data-i18n-key', 'toolbar.title.classic');
                toolbarTitle.textContent = this.i18n.t('toolbar.title.classic');
            } else { // 'evacuation'
                toolbarTitle.setAttribute('data-i18n-key', 'toolbar.title.main');
                toolbarTitle.textContent = this.i18n.t('toolbar.title.main');
            }
        }
    }

    public getCurrentWorkspace(): Workspace | null {
        return this.currentWorkspace;
    }
}