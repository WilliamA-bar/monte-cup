import { Vector3, HemisphericLight, MeshBuilder, StandardMaterial, Color3, PointLight, Color4, ArcRotateCamera, Texture,     LensRenderingPipeline, ShadowGenerator, Mesh, SceneLoader } from '@babylonjs/core';
import { SceneContainer } from '../core/SceneContainer';
import { CupLineEntity } from '../components/CupLineEntity';
import { UIEntity } from '../components/UIEntity';
import { GameState, PlayerState, GAME_CONSTANTS } from '../../sdk_extension_logic/schema';
import { BaseHostRoom } from '../../sdk';
import type { MessageType, MessagePayloads } from '../../sdk_extension_logic/schema';
export class CupShuffleScene extends SceneContainer {
    private mainCamera!: ArcRotateCamera;
    private cupLine: CupLineEntity | null = null;
    private uiEntity: UIEntity | null = null;
    private currentPhase: string | null = null;
    private stateCheckInterval: NodeJS.Timeout | null = null;
    private ground: Mesh | null = null;

    public async initialize(): Promise<void> {
        await this.beforeStart();
        await this.setupCups();
        
        // Check state every second
        this.stateCheckInterval = setInterval(() => {
            this.runActionsBasedOnState(this.room).catch(console.error);
        }, 1000);
    }

    private async runActionsBasedOnState(room: BaseHostRoom<GameState<PlayerState>, PlayerState, MessageType, MessagePayloads>): Promise<void> {
        //console.log("[Client] Running actions based on state");
        if (!this.uiEntity) return;
        
        // Only process if this is a new phase
        if (this.currentPhase === room.state.game_phase) {
            //console.log("[Client] Same phase, skipping");
            // Wait for 1 second before running the next action
            await new Promise(resolve => setTimeout(resolve, 1000));
            return;
        }

        this.currentPhase = room.state.game_phase;
        
        switch (room.state.game_phase) {
            case GAME_CONSTANTS.PHASES.SETUP:
                console.log("Awaiting setup");
                break;
            case GAME_CONSTANTS.PHASES.DISPLAY_COUPON:
                console.log("[Client] Entered phase: DisplayCoupon");
                this.uiEntity.setMessage(room);
                await this.displayCouponPhase();
                console.log("[Client] Exited phase: DisplayCoupon");
                break;
            case GAME_CONSTANTS.PHASES.SHUFFLE_CUPS:
                console.log("[Client] Entered phase: ShuffleCups");
                this.uiEntity.setMessage(room);
                await this.shuffleCups();
                console.log("[Client] Exited phase: ShuffleCups");
                break;
            case GAME_CONSTANTS.PHASES.GUESSING_PHASE:
                console.log("[Client] Entered phase: GuessingPhase");
                this.uiEntity.setMessage(room);
                await this.guessingPhase();
                console.log("[Client] Exited phase: GuessingPhase");
                break;
            case GAME_CONSTANTS.PHASES.REVEAL_COUPON:
                console.log("[Client] Entered phase: RevealCoupon");
                this.uiEntity.setMessage(room);
                await this.revealCoupon();
                console.log("[Client] Exited phase: RevealCoupon");
                break;
            case GAME_CONSTANTS.PHASES.END_ROUND:
                console.log("[Client] Entered phase: Reset");
                await this.resetRound();
                console.log("[Client] Exited phase: Reset");
                break;
            case GAME_CONSTANTS.PHASES.GAME_OVER:
                console.log("[Client] Entered phase: GameOver");
                this.uiEntity.setMessage(room);
                console.log("[Client] Exited phase: GameOver");
                break;
            default:
                console.log("[Client] Invalid game state");
                break;
        }
    }

    public async beforeStart(): Promise<void> {
        this.scene.clearColor = new Color4(0.1, 0.1, 0.15, 1);
        this.setupCamera();
        await this.setupEnvironment();
        this.setupLights();
        this.uiEntity = new UIEntity(this.scene);
    }

    protected setupCamera(): void {
        this.mainCamera = new ArcRotateCamera(
            'mainCamera',
            Math.PI / 2,
            Math.PI / 2.3,
            11,
            new Vector3(0, 1.5, 0),
            this.scene
        );
        this.camera = this.mainCamera;
        this.camera.attachControl(this.canvas, true);
        //this.mainCamera.inputs.clear();

        const parameters = {
            
        };
        new LensRenderingPipeline('lensEffects', parameters, this.scene, 1.0, [this.camera]);
    }

    protected async setupEnvironment(): Promise<void> {
        // Create ground with ice texture
        this.ground = MeshBuilder.CreateGround('ground', {
            width: 165,
            height: 150,
            subdivisions: 1
        }, this.scene);

        const groundMaterial = new StandardMaterial('groundMaterial', this.scene);
        const iceTexture = new Texture("./textures/iceper.png", this.scene);
        iceTexture.anisotropicFilteringLevel = 16; 
        iceTexture.updateSamplingMode(Texture.TRILINEAR_SAMPLINGMODE);
        iceTexture.uScale = 7;
        iceTexture.vScale = 7;
        groundMaterial.diffuseTexture = iceTexture;
        groundMaterial.specularColor = new Color3(0.1, 0.1, 0.2);
        groundMaterial.roughness = 0.0;
        this.ground.material = groundMaterial;

        // Load the rink model - only load once
        const result = await SceneLoader.ImportMeshAsync("", "./meshes/", "dallasrink.glb", this.scene);
        
        // Position and scale the rink
        result.meshes.forEach(mesh => {
            if (mesh.name !== "__root__") {  // Skip the root mesh
                mesh.scaling = new Vector3(3.5, 3.5, 3.5);
                mesh.position = new Vector3(0, 0, -40);
                
            }
        });
    }

    protected setupLights(): void {
        const ambientLight = new HemisphericLight('ambientLight', new Vector3(5, 1, 11), this.scene);
        ambientLight.intensity = 0.4;
        ambientLight.groundColor = new Color3(0.549, 0.596, .639);
        ambientLight.diffuse = new Color3(0.78, 0.894, 1);

        const spotLight = new PointLight('spotLight', new Vector3(0, 8, -10), this.scene);
        spotLight.intensity = 0.9;
        spotLight.diffuse = new Color3(.933, 0.969, 1);
        spotLight.specular = new Color3(.933, 0.969, 1);
        spotLight.radius = 1.5;
        spotLight.range = 17;

        

        const frontLight = new PointLight('frontLight', new Vector3(0, 5, 8), this.scene);
        frontLight.intensity = 0.7;
        frontLight.diffuse = new Color3(0.9, 0.8, 0.6);
        frontLight.specular = new Color3(0.9, 0.8, 0.6);
        frontLight.radius = 0.1;
        frontLight.range = 20;

        const shadowGenerator = new ShadowGenerator(1024, spotLight);
        const shadowMap = shadowGenerator.getShadowMap();
        if (shadowMap?.renderList && this.ground) {
            shadowMap.renderList.push(this.ground);
        }
    }

    protected onGameStateChanged(state: GameState<PlayerState>): void {
        console.log("Game state changed:", state);
    }

    protected async setupCups(): Promise<void> {
        this.cupLine = new CupLineEntity(
            this.scene,
            new Vector3(0, 0, 0),
            this.room
        );
        await this.cupLine.initialize();
    }

    protected async displayCouponPhase(): Promise<void> {
        if (!this.cupLine) return;
        await this.cupLine.displayCouponPhase();
    }

    protected async shuffleCups(): Promise<void> {
        if (!this.cupLine) return;
        await this.cupLine.shuffleLinePhase();
    }

    protected async guessingPhase(): Promise<void> {
        if (!this.cupLine) return;
        await this.cupLine.guessingPhase(this.room);
    }


    protected async revealCoupon(): Promise<void> {
        if (!this.cupLine) return;
        await this.cupLine.displayCouponPhase();
    }

    protected async resetRound(): Promise<void> {
        if (!this.cupLine) return;
        await this.cupLine.resetLine();
    }

    public dispose(): void {
        if (this.stateCheckInterval) {
            clearInterval(this.stateCheckInterval);
            this.stateCheckInterval = null;
        }
        if (this.uiEntity) {
            this.uiEntity.dispose();
        }
        super.dispose();
    }
} 