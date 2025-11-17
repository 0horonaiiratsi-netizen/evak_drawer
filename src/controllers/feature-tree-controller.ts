import { SceneObject } from '../scene/scene-object';
import { App } from '../app';
import { SceneObserver, SelectionObserver } from './interfaces';

export class FeatureTreeController implements SceneObserver, SelectionObserver {
    private app: App;
    private container: HTMLElement;

    constructor(app: App, containerId: string) {
        this.app = app;
        this.container = document.getElementById(containerId)!;
        this.app.projectStateService.subscribeScene(this);
        this.app.selectionService.subscribe(this);
        this.rebuildTree();
    }

    onSceneChanged(): void {
        this.rebuildTree();
    }

    onSelectionChanged(selectedObjects: SceneObject[]): void {
        const selectedIds = new Set(selectedObjects.map(obj => obj.id));
        const elements = this.container.querySelectorAll('.feature-tree-element');
        elements.forEach(el => {
            const element = el as HTMLElement;
            const objId = parseInt(element.dataset.objId!, 10);
            if (selectedIds.has(objId)) {
                element.classList.add('selected');
            } else {
                element.classList.remove('selected');
            }
        });
    }

    private rebuildTree(): void {
        this.container.innerHTML = '';
        const objects = this.app.sceneService.objects;
        objects.forEach(obj => {
            const element = this.createTreeElement(obj);
            this.container.appendChild(element);
        });
    }

    private createTreeElement(obj: SceneObject): HTMLElement {
        const element = document.createElement('div');
        element.classList.add('feature-tree-element');
        element.textContent = `${obj.constructor.name} (${obj.id})`;
        element.dataset.objId = obj.id.toString();
        element.addEventListener('click', () => {
            this.app.selectionService.setSingle(obj.id);
        });
        return element;
    }
}
