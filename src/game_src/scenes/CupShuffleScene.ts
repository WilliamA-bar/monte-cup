import { Vector3, HemisphericLight, MeshBuilder, StandardMaterial, Color3, PointLight, Color4, ArcRotateCamera } from '@babylonjs/core';
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
            Math.PI / 3,
            10,
            Vector3.Zero(),
            this.scene
        );
        this.camera = this.mainCamera;
        this.mainCamera.inputs.clear();
    }

    protected async setupEnvironment(): Promise<void> {
        const ground = MeshBuilder.CreateGround('ground', {
            width: 25,
            height: 20,
            subdivisions: 2
        }, this.scene);

        const groundMaterial = new StandardMaterial('groundMaterial', this.scene);
        groundMaterial.diffuseColor = new Color3(0.8, 0.5, 0.3);
        ground.material = groundMaterial;
    }

    protected setupLights(): void {
        const ambientLight = new HemisphericLight('ambientLight', new Vector3(0, 1, 0), this.scene);
        ambientLight.intensity = 0.2;
        ambientLight.groundColor = new Color3(0.2, 0.2, 0.2);

        const spotLight = new PointLight('spotLight', new Vector3(0, 8, 0), this.scene);
        spotLight.intensity = 0.8;
        spotLight.diffuse = new Color3(1, 0.95, 0.8);
        spotLight.specular = new Color3(1, 0.95, 0.8);
        spotLight.radius = 0.1;
        spotLight.range = 15;

        const frontLight = new PointLight('frontLight', new Vector3(0, 0, 10), this.scene);
        frontLight.intensity = 0.5;
        frontLight.diffuse = new Color3(1, 0.95, 0.8);
        frontLight.specular = new Color3(1, 0.95, 0.8);
        frontLight.radius = 0.1;
        frontLight.range = 15;
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