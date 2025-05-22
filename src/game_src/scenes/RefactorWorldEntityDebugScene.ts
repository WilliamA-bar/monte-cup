import { PlayerState } from "../../sdk_extension_logic/schema";
import { GameState } from "../../sdk_extension_logic/schema";
import { SceneContainer } from "../core/SceneContainer";
import {  ArcRotateCamera, HemisphericLight, MeshBuilder, StandardMaterial, Vector3 } from "@babylonjs/core";
import { RefactoredHelmetEntity } from "../components/RefactoredHelmetEntity";

export class RefactorWorldEntityDebugScene extends SceneContainer {

    private hemlet: RefactoredHelmetEntity | null = null;
    protected camera: ArcRotateCamera | null = null;

    public async initialize(): Promise<void> {

        this.hemlet = new RefactoredHelmetEntity(this.room.state.world_entities.hemlet, this.scene);
        this.setupEnvironment();
        this.setupLights();
        this.setupCamera();
        // Create game loop that runs at 60fps
        const containerLoop = () => {
            this.onGameStateChanged(this.room.state);
            requestAnimationFrame(containerLoop);
        };
        requestAnimationFrame(containerLoop);
    }

    public async setupCamera(): Promise<void> {
        this.camera = new ArcRotateCamera("camera", 0, 0, 0, new Vector3(0, 0, 0), this.scene);
        this.camera.attachControl(this.canvas, true);
    }

    public async setupEnvironment(): Promise<void> {
        // Create a ground
        const ground = MeshBuilder.CreateGround("ground", { width: 100, height: 100 }, this.scene);
        ground.position.y = 0;
        ground.position.x = 0;
        ground.position.z = 0;
        ground.material = new StandardMaterial("ground", this.scene);

    }
    
    public async setupLights(): Promise<void> {
        // Basic light setup
        const light = new HemisphericLight("light", new Vector3(0, 1, 0), this.scene);
        light.intensity = 0.5;
    }

    public async onGameStateChanged(state:  GameState<PlayerState>): Promise<void> {
        if (this.hemlet) {
            this.hemlet.update(0.1,state.world_entities.hemlet);
            console.log("Game state changed", state);
        }
    }


}