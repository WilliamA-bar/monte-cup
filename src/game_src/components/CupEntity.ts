import { Mesh, Scene, MeshBuilder, Vector3, StandardMaterial, Color3, ActionManager, ExecuteCodeAction, Observer } from '@babylonjs/core';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import '@babylonjs/loaders/glTF';
/**
 * Represents a cup in the cup shuffle game.
 * Handles the cup's mesh, animations, and interactions.
 */
export class CupEntity {
    private mesh!: Mesh;
    private couponMesh!: Mesh;
    private scene: Scene;
    private isOpenable: boolean;
    private id: number;
    private isOpened: boolean;
    private position: Vector3;
    private name: string;
    private positionObserver: Observer<Scene>;

    /**
     * Creates a new cup entity.
     * @param scene The BabylonJS scene
     * @param position Initial position of the cup
     * @param name Unique identifier for the cup
     */
    constructor(scene: Scene, position: Vector3, name: string = 'cup', id: number) {
        this.scene = scene;
        this.id = id;
        this.position = position;
        this.isOpenable = false;
        this.isOpened = false;
        this.name = name;
        // Store the observer reference
        this.positionObserver = this.scene.onBeforeRenderObservable.add(() => {
            this.updateMeshes();
        });
    }

    public async initialize(): Promise<void> {
        this.mesh = await this.createCupMesh(this.name);
        this.couponMesh = this.createCouponMesh(this.name + '_coupon');
        
        // Set initial positions
        this.mesh.position = this.position;
        this.couponMesh.position = this.position.clone();
        this.couponMesh.rotation.x = Math.PI / 6;
        
        this.setupMaterial();
        this.setupClickAction();
        
        // Initially hide the coupon
        this.couponMesh.setEnabled(false);
        //this.mesh.setEnabled(false);
    }

    private updateMeshes(): void {
        // Keep the helmet (mesh) stationary
        this.mesh.position = this.position.clone();
        this.mesh.position.y = 1; // Keep helmet at ground level
        this.couponMesh.rotation.y += 0.06;

        // Move the hockey puck (couponMesh) up and down
        this.couponMesh.position = this.position.clone();
        this.couponMesh.position.y = this.position.y; // Use the y position from lift()
        this.couponMesh.setEnabled(this.isOpened);
    }

    // PUBLIC METHODS

    /**
     * Gets the current position of the cup.
     */
    public getPosition(): Vector3 {
        return this.position;
    }

    /**
     * Gets the id of the cup.
     */
    public getId(): number {
        return this.id;
    }

    /**
     * Sets whether this cup can be opened by clicking.
     */
    public setOpenable(isOpenable: boolean): void {
        this.isOpenable = isOpenable;
    }

    /**
     * Animates the cup to a new position with an arcing motion.
     * @param targetPosition The position to move to
     * @param duration Time in seconds for the movement
     * @param shuffle_back Whether to arc backwards instead of forwards
     */
    public async shuffleTo(targetPosition: Vector3, duration: number = 1, shuffle_back: boolean = false): Promise<void> {
        return new Promise((resolve) => {
            const startPosition = this.position.clone();
            const endPosition = targetPosition.clone();
            endPosition.y = startPosition.y;
            
            // Calculate arc parameters
            const radius = Vector3.Distance(startPosition, endPosition) / 2;
            
            // Calculate direction and perpendicular vector for arc
            const direction = endPosition.subtract(startPosition).normalize();
            const perpendicular = shuffle_back 
                ? new Vector3(direction.z, 0, direction.x)
                : new Vector3(-direction.z, 0, direction.x);

            const startTime = Date.now();
            
            const updatePosition = () => {
                const currentTime = Date.now();
                const elapsed = (currentTime - startTime) / 1000; // Convert to seconds
                const progress = Math.min(elapsed / duration, 1);
                
                // Quadratic ease out
                const easedProgress = 1 - (1 - progress) * (1 - progress);
                
                // Calculate position with eased timing
                const linearPos = Vector3.Lerp(startPosition, endPosition, easedProgress);
                const sideOffset = Math.sin(Math.PI * easedProgress) * radius;
                const newPos = linearPos.add(perpendicular.scale(sideOffset));
                newPos.y = startPosition.y;
                
                this.position = newPos;
                
                if (progress < 1) {
                    setTimeout(updatePosition, 16);
                } else {
                    this.position = endPosition;
                    resolve();
                }
            };
            
            updatePosition();
        });
    }

    /**
     * Reveals the contents of the cup by lifting it.
     */
    public async revealContents(): Promise<void> {
        this.isOpened = true;
        
        await this.lift(2.5);
        setTimeout(() => {
            this.lift(-2.5);
        }, 2500);
        
    }

    /**
     * Cleans up resources used by this cup.
     */
    public dispose(): void {
        this.mesh.dispose();
        this.couponMesh.dispose();
        this.scene.onBeforeRenderObservable.remove(this.positionObserver);
    }

    // PRIVATE METHODS

    /**
     * Creates the cup's mesh.
     */
    private createCupMesh(name: string): Promise<Mesh> {
        return new Promise((resolve) => {
            const tempMesh = MeshBuilder.CreateCylinder(name, {
                height: 1.5,
                diameter: 1.5,
                tessellation: 20
            }, this.scene);

            SceneLoader.ImportMesh("", "./meshes/", "helmet2strapless.glb", this.scene, 
                (meshes) => {
                    const helmetMesh = meshes[0] as Mesh;
                    helmetMesh.name = name;
                    helmetMesh.position = tempMesh.position.clone();
                    helmetMesh.scaling = new Vector3(1.5, 1.5, 1.5);
                    
                    // Replace the temporary mesh with the helmet mesh
                    this.mesh = helmetMesh;
                    tempMesh.dispose();
                    resolve(helmetMesh);
                },
                undefined,
                (message) => {
                    console.error("Error loading helmet model:", message);
                    // If loading fails, use the temporary mesh
                    resolve(tempMesh);
                }
            );
        });
    }

    /**
     * Creates the coupon mesh that appears under the cup.
     */
    private createCouponMesh(name: string): Mesh {
        const puck = MeshBuilder.CreateCylinder(name, {
            height: 0.2,
            diameter: 0.8,
            tessellation: 20
        }, this.scene);
        
        const material = new StandardMaterial(name + '_material', this.scene);
        material.diffuseColor = new Color3(0.2, 0.2, 0.2); // Dark gray for puck
        puck.material = material;
        
        return puck;
    }

    /**
     * Sets up the cup's material.
     */
    private setupMaterial(): void {
        const material = new StandardMaterial('cupMaterial', this.scene);
        material.diffuseColor = new Color3(0.8, 0.1, 0.1);
        this.mesh.material = material;
    }

    /**
     * Sets up click interaction for the cup.
     */
    private setupClickAction(): void {
        this.mesh.actionManager = new ActionManager(this.scene);
        this.mesh.actionManager.registerAction(
            new ExecuteCodeAction(
                ActionManager.OnPickTrigger,
                () => {
                    console.log(`Cup clicked: ${this.mesh.name}`);
                    if (this.isOpenable) {
                        this.revealContents();
                    }
                }
            )
        );
    }

    /**
     * Lifts the cup up or down by the specified height.
     */
    public lift(height: number, duration: number = 0.5): void {
        const startPosition = this.position.clone();
        const targetPosition = this.position.clone();
        targetPosition.y += height;
        const startTime = Date.now();
        
        const updatePosition = () => {
            const currentTime = Date.now();
            const elapsed = (currentTime - startTime) / 1000; // Convert to seconds
            const progress = Math.min(elapsed / duration, 1);
            
            // Quadratic ease out
            const easedProgress = 1 - (1 - progress) * (1 - progress);
            
            // Update position directly
            this.position = Vector3.Lerp(startPosition, targetPosition, easedProgress);
            
            // Show/hide the coupon based on height
            // If the cup is lifted more than 1 unit, show the coupon
            this.isOpened = this.position.y > 0.76;

            console.log("Position", this.position," isOpened", this.isOpened);
            
            if (progress < 1) {
                setTimeout(updatePosition, 16);
            }
        };
        
        updatePosition();
    }

}
