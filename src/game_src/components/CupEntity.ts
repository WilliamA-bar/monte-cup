import { Mesh, Scene, MeshBuilder, Vector3, StandardMaterial, Color3, Animation, ActionManager, ExecuteCodeAction } from '@babylonjs/core';
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
    private isCorrect: boolean;
    private isOpenable: boolean;
    private id: number;
    private position: Vector3;
    private name: string;

    /**
     * Creates a new cup entity.
     * @param scene The BabylonJS scene
     * @param position Initial position of the cup
     * @param name Unique identifier for the cup
     * @param isCorrect Whether this cup contains the coupon
     */
    constructor(scene: Scene, position: Vector3, name: string = 'cup', isCorrect: boolean = false, id: number) {
        this.scene = scene;
        this.isCorrect = isCorrect;
        this.id = id;
        this.position = position;
        this.isOpenable = false;
        this.name = name;
    }

    public async initialize(): Promise<void> {
        this.mesh = await this.createCupMesh(this.name);
        this.couponMesh = this.createCouponMesh(this.name + '_coupon');
        
        // Set initial positions
        this.mesh.position = this.position;
        this.couponMesh.position = this.position.clone();
        this.couponMesh.position.y -= 0.5; // Position coupon below cup
        
        this.setupMaterial();
        this.setupClickAction();
        
        // Initially hide the coupon
        this.couponMesh.setEnabled(false);
    }

    // PUBLIC METHODS

    /**
     * Gets the current position of the cup.
     */
    public getPosition(): Vector3 {
        return this.mesh.position;
    }

    /**
     * Gets whether this cup contains the coupon.
     * @returns True if this cup contains the coupon, false otherwise
     */
    public getCorrect(): boolean {
        return this.isCorrect;
    }

    /**
     * Sets whether this cup contains the coupon.
     */
    public setCorrect(isCorrect: boolean): void {
        this.isCorrect = isCorrect;
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
            const startPosition = this.mesh.position.clone();
            const endPosition = targetPosition.clone();
            
            // Calculate arc parameters
            const radius = Vector3.Distance(startPosition, endPosition) / 2;
            
            // Calculate direction and perpendicular vector for arc
            const direction = endPosition.subtract(startPosition).normalize();
            const perpendicular = shuffle_back 
                ? new Vector3(direction.z, 0, direction.x)
                : new Vector3(-direction.z, 0, direction.x);

            const startTime = Date.now();
            const observer = this.scene.onBeforeRenderObservable.add(() => {
                const currentTime = Date.now();
                const elapsedTime = (currentTime - startTime) / 1000;
                
                if (elapsedTime >= duration) {
                    this.mesh.position = endPosition;
                    this.scene.onBeforeRenderObservable.remove(observer);
                    resolve();
                    return;
                }

                const t = elapsedTime / duration;
                const linearPos = Vector3.Lerp(startPosition, endPosition, t);
                const sideOffset = Math.sin(Math.PI * t) * radius;
                const newPos = linearPos.add(perpendicular.scale(sideOffset));
                newPos.y = startPosition.y;
                
                this.mesh.position = newPos;
            });
            this.couponMesh.position = this.mesh.position;
        });
    }

    /**
     * Reveals the contents of the cup by lifting it.
     */
    public async revealContents(): Promise<void> {
        if (this.isCorrect) {
            this.couponMesh.isVisible = true;
        }

        console.log("Should show coupon:", this.isCorrect);
        await this.lift(2.5);
        await new Promise<void>(resolve => {
            let timeElapsed = 0;
            const observer = this.scene.onBeforeRenderObservable.add(() => {
                timeElapsed += this.scene.getEngine().getDeltaTime();
                if (timeElapsed >= 2000) {
                    this.scene.onBeforeRenderObservable.remove(observer);
                    resolve();
                }
            });
        });
        await this.lift(-2.5);
    }

    /**
     * Cleans up resources used by this cup.
     */
    public dispose(): void {
        this.mesh.dispose();
        this.couponMesh.dispose();
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

            SceneLoader.ImportMesh("", "./meshes/", "hockey_helmet.glb", this.scene, 
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
    public async lift(height: number, duration: number = 0.5): Promise<void> {
        const targetPosition = this.mesh.position.clone();
        targetPosition.y += height;
        
        // Keep coupon on the ground when cup is lifted
        if (this.isCorrect) {
            const shouldShow = targetPosition.y > .4;
            
            // Keep coupon at ground level but update x and z to match cup
            this.couponMesh.position.x = this.mesh.position.x;
            this.couponMesh.position.z = this.mesh.position.z;
            this.couponMesh.position.y = 0.1; // Slightly above ground
            
            this.couponMesh.setEnabled(shouldShow);
            this.couponMesh.isVisible = shouldShow;
        }

        await this.moveTo(targetPosition, duration);
    }


    private async moveTo(targetPosition: Vector3, duration: number = 1): Promise<void> {
        return new Promise((resolve) => {
            const frameRate = 60;
            const animation = new Animation(
                'cupMovement',
                'position',
                frameRate,
                Animation.ANIMATIONTYPE_VECTOR3,
                Animation.ANIMATIONLOOPMODE_CONSTANT
            );

            const keyFrames = [
                { frame: 0, value: this.mesh.position.clone() },
                { frame: frameRate * duration, value: targetPosition }
            ];
            animation.setKeys(keyFrames);
            this.mesh.animations = [animation];

            // For coupon, only animate X and Z, keep Y at ground level
            if (this.isCorrect) {
                const couponAnimation = new Animation(
                    'couponMovement',
                    'position',
                    frameRate,
                    Animation.ANIMATIONTYPE_VECTOR3,
                    Animation.ANIMATIONLOOPMODE_CONSTANT
                );

                const couponKeyFrames = [
                    { 
                        frame: 0, 
                        value: new Vector3(
                            this.mesh.position.x,
                            0.1, // Keep at ground level
                            this.mesh.position.z
                        )
                    },
                    { 
                        frame: frameRate * duration, 
                        value: new Vector3(
                            targetPosition.x,
                            0.1, // Keep at ground level
                            targetPosition.z
                        )
                    }
                ];
                couponAnimation.setKeys(couponKeyFrames);
                this.couponMesh.animations = [couponAnimation];
            }

            this.scene.beginAnimation(this.mesh, 0, frameRate * duration, false, 1, () => {
                if (this.isCorrect) {
                    const shouldShow = this.mesh.position.y > 1;
                    this.couponMesh.setEnabled(shouldShow);
                    this.couponMesh.isVisible = shouldShow;
                }
                resolve();
            });

            if (this.isCorrect) {
                this.scene.beginAnimation(this.couponMesh, 0, frameRate * duration, false);
            }
        });
    }

}
