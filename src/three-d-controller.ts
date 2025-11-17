/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { App } from './app';
import { CutObject } from './scene/cut-object';
import { ExtrudeObject } from './scene/extrude-object';
import { LoftObject } from './scene/loft-object';
import { RevolveObject } from './scene/revolve-object';
import { SweepObject } from './scene/sweep-object';

// Since three.js is loaded from a CDN as a non-module script,
// it creates a global THREE object. We declare it here to satisfy TypeScript.
declare const THREE: any;

/**
 * Manages the three.js scene, camera, renderer, and user controls for the 3D view.
 */
export class ThreeDController {
    private app: App;
    private canvas: HTMLCanvasElement;
    private scene: any; // THREE.Scene;
    private camera: any; // THREE.PerspectiveCamera;
    private renderer: any; // THREE.WebGLRenderer;
    private controls: any; // OrbitControls;
    private animationFrameId: number | null = null;

    /**
     * Initializes the 3D environment.
     * @param canvas The HTML canvas element to render on.
     * @param app A reference to the main application instance.
     */
    constructor(canvas: HTMLCanvasElement, app: App) {
        this.canvas = canvas;
        this.app = app;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a1a);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
        this.camera.position.set(100, 100, 200);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 200, 100);
        this.scene.add(directionalLight);
        
        const gridHelper = new THREE.GridHelper(1000, 20, 0x404040, 0x404040);
        this.scene.add(gridHelper);

        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    /**
     * Handles window resize events to keep the camera and renderer updated.
     */
    private onWindowResize(): void {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    /**
     * Updates the 3D scene to reflect the current state of 3D objects in the app.
     * It clears old meshes and creates new ones from ExtrudeObject definitions.
     */
    public syncScene(): void {
        // Remove all existing meshes from the scene
        const meshes = this.scene.children.filter((child: any) => child.isMesh);
        meshes.forEach((mesh: any) => this.scene.remove(mesh));
        
        // Find all 3D-representable objects that are not hidden
        const threeDObjects = this.app.sceneService.objects.filter(obj => 
            !obj.isHidden && (obj instanceof ExtrudeObject || obj instanceof RevolveObject || obj instanceof CutObject || obj instanceof SweepObject || obj instanceof LoftObject)
        );

        // Create and add meshes for each object
        threeDObjects.forEach(obj => {
            const mesh = (obj as any).getOrCreateMesh(this.app);
            if (mesh) {
                this.scene.add(mesh);
            }
        });
    }

    /**
     * The main animation loop that renders the scene.
     */
    private animate(): void {
        this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
    
    /**
     * Starts the animation loop for the 3D view.
     */
    public activate(): void {
        this.onWindowResize();
        this.animate();
    }
    
    /**
     * Stops the animation loop to conserve resources when the 3D view is not active.
     */
    public deactivate(): void {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }
}