import { Vector3, HemisphericLight, SpotLight, MeshBuilder, StandardMaterial, Color3, PointLight, Color4, ArcRotateCamera, Texture,     LensRenderingPipeline, ShadowGenerator, Mesh, SceneLoader } from '@babylonjs/core';
import { SceneContainer } from '../core/SceneContainer';
import { CupLineEntity } from '../components/CupLineEntity';
import { GameState, PlayerState, GAME_CONSTANTS } from '../../sdk_extension_logic/schema';
export class CupShuffleScene extends SceneContainer {
    private mainCamera!: ArcRotateCamera;
    private cupLine: CupLineEntity | null = null;
    private currentPhase: string | null = null;
    private stateCheckInterval: NodeJS.Timeout | null = null;
    private ground: Mesh | null = null;
    private ground2: Mesh | null = null;
    private ground3: Mesh | null = null;
    private ground4: Mesh | null = null;

    public async initialize(): Promise<void> {
        await this.beforeStart();
        await this.setupCups();
        
        // Check state every second
        this.stateCheckInterval = setInterval(() => {
            this.runActionsBasedOnState().catch(console.error);
        }, 1000);
    }

    private async runActionsBasedOnState(): Promise<void> {
        // Only process if this is a new phase
        if (this.currentPhase === this.room.state.game_phase) {
            // Wait for 1 second before running the next action
            await new Promise(resolve => setTimeout(resolve, 1000));
            return;
        }

        this.currentPhase = this.room.state.game_phase;
        
        switch (this.room.state.game_phase) {
            case GAME_CONSTANTS.PHASES.SETUP:
                console.log("Awaiting setup");
                break;
            case GAME_CONSTANTS.PHASES.DISPLAY_COUPON:
                console.log("[Client] Entered phase: DisplayCoupon");
                await this.displayCouponPhase();
                console.log("[Client] Exited phase: DisplayCoupon");
                break;
            case GAME_CONSTANTS.PHASES.SHUFFLE_CUPS:
                console.log("[Client] Entered phase: ShuffleCups");
                await this.shuffleCups();
                console.log("[Client] Exited phase: ShuffleCups");
                break;
            case GAME_CONSTANTS.PHASES.GUESSING_PHASE:
                console.log("[Client] Entered phase: GuessingPhase");
                await this.guessingPhase();
                console.log("[Client] Exited phase: GuessingPhase");
                break;
            case GAME_CONSTANTS.PHASES.REVEAL_COUPON:
                console.log("[Client] Entered phase: RevealCoupon");
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
                console.log("[Client] Exited phase: GameOver");
                break;
            default:
                console.log("[Client] Invalid game state");
                break;
        }
    }

    public async beforeStart(): Promise<void> {
        this.scene.clearColor = new Color4(0.05, 0.05, 0.10, 1);
        this.setupCamera();
        await this.setupEnvironment();
        this.setupLights();
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
        //this.camera.attachControl(this.canvas, true);
        //this.mainCamera.inputs.clear();

        const parameters = {
            
        };
        new LensRenderingPipeline('lensEffects', parameters, this.scene, 1.0, [this.camera]);
    }

    protected async setupEnvironment(): Promise<void> {
        // Create ground with ice texture
        this.ground = MeshBuilder.CreateGround('ground', {
            width: 150,
            height: 150,
            subdivisions: 1
        }, this.scene);

        this.ground2 = MeshBuilder.CreateGround('ground2', {
            width: 150,
            height: 150,
            subdivisions: 1
        }, this.scene);

        this.ground3 = MeshBuilder.CreateGround('ground3', {
            width: 150,
            height: 150,
            subdivisions: 1
        }, this.scene);

        this.ground4 = MeshBuilder.CreateGround('ground4', {
            width: 150,
            height: 150,
            subdivisions: 1
        }, this.scene);

        this.ground2.position.y = 0.01;
        this.ground3.position.y = 0.02;
        this.ground4.position.y = 0.03;

        //let mixMaterial = new MixMaterial("mixMaterial", this.scene);

        const base_ice_material = new StandardMaterial('groundMaterial', this.scene);
        
        const iceTexture = new Texture("./textures/ice.png", this.scene);
        iceTexture.anisotropicFilteringLevel = 16; 
        iceTexture.uScale = 9;
        iceTexture.vScale = 9;
        
        base_ice_material.diffuseTexture = iceTexture;
        this.ground.material = base_ice_material;


        // Create and setup logo material
        const ground2Material = new StandardMaterial('ground2Material', this.scene);
        ground2Material.roughness = 0.9;  // Increase roughness for matte look
        ground2Material.specularColor = new Color3(0.1, 0.1, 0.1);  // Reduce specular intensity
        ground2Material.specularPower = 1;  // Lower specular power for more diffuse reflection

        // Stars logo
        const logoTexture = new Texture("./textures/dallasstarslogo.png", this.scene);
        logoTexture.hasAlpha = true;
        logoTexture.anisotropicFilteringLevel = 16;
        logoTexture.wAng = Math.PI;
        logoTexture.uScale = 4;  // Make the logo smaller
        logoTexture.vScale = 4;  // Make the logo smaller
        logoTexture.uOffset = -1.55; // Center horizontally (0.5 - uScale/2)
        logoTexture.vOffset = -1.55; // Center vertically (0.5 - vScale/2)
        logoTexture.wrapU = Texture.CLAMP_ADDRESSMODE;  // Prevent repeating
        logoTexture.wrapV = Texture.CLAMP_ADDRESSMODE;  // Prevent repeating
        
        ground2Material.diffuseTexture = logoTexture;
        this.ground2.material = ground2Material;

        // Create and setup rink-markings material
        const ground3Material = new StandardMaterial('ground3Material', this.scene);
        ground3Material.roughness = 0.9;  // Increase roughness for matte look
        ground3Material.specularColor = new Color3(0.1, 0.1, 0.1);  // Reduce specular intensity
        ground3Material.specularPower = 1;  // Lower specular power for more diffuse reflection
        

        // Hockey rink markings
        const rinkMarkings = new Texture("./textures/hockey-rink-markings.png", this.scene);
        rinkMarkings.anisotropicFilteringLevel = 16; 
        rinkMarkings.uScale = 1;
        rinkMarkings.vScale = 1;
        rinkMarkings.hasAlpha = true;
        
        ground3Material.diffuseTexture = rinkMarkings;
        this.ground3.material = ground3Material;

        // Transparent ice
        const ground4Material = new StandardMaterial('ground4Material', this.scene);
        ground4Material.diffuseTexture = iceTexture;
        const ice2Texture = new Texture("./textures/ice.png", this.scene);
        ice2Texture.anisotropicFilteringLevel = 16; 
        //ice2Texture.updateSamplingMode(Texture.LINEAR_LINEAR_MIPLINEAR);
        ice2Texture.uScale = 9;
        ice2Texture.vScale = 9;
        ice2Texture.hasAlpha = true;
        ground4Material.alpha = 0.6;
                
        ground4Material.diffuseTexture = ice2Texture;
        this.ground4.material = ground4Material;

        // Load the rink model - only load once
        const result = await SceneLoader.ImportMeshAsync("", "./meshes/", "dallasrink.glb", this.scene);
        
        // Position and scale the rink
        result.meshes.forEach(mesh => {
            if (mesh.name !== "__root__") {  // Skip the root mesh
                mesh.scaling = new Vector3(3.5, 3.5, 3.5);
                mesh.position = new Vector3(0, 0, -42.5);
            }
        });

        // Load the mini ice rink
        const miniRinkResult = await SceneLoader.ImportMeshAsync("", "./meshes/", "minirink.glb", this.scene);
        
        // Position and scale the mini rink
        miniRinkResult.meshes.forEach(mesh => {
            // Apply transformations to all meshes, including the root
            mesh.scaling = new Vector3(3.0, 3.0, 3.0);
            mesh.position = new Vector3(0, 0, -21);
            mesh.rotation = new Vector3(0, 0, 0);
            
            // Ensure the mesh is set up to receive lighting
            if (mesh.material) {
                const material = mesh.material as StandardMaterial;
                material.backFaceCulling = false;
                material.disableLighting = false;
            }
            
            // If this is the root mesh, make sure it's visible and properly set up
            if (mesh.name === "__root__") {
                mesh.isVisible = true;
                mesh.setEnabled(true);
            }
        });

        // Log the meshes for debugging
        console.log("Mini rink meshes:", miniRinkResult.meshes.map(m => ({
            name: m.name,
            position: m.position,
            scaling: m.scaling,
            rotation: m.rotation
        })));


        const sponsor_width = 10;
        const sponsor_height = 10;
        // Sponsorships lining the back wall
        const logo1 = MeshBuilder.CreatePlane('sponsor1', {
            width: sponsor_width,
            height: sponsor_height
        }, this.scene);

        const logo2 = MeshBuilder.CreatePlane('sponsor2', {
            width: sponsor_width,
            height: sponsor_height
        }, this.scene);

        const logo3 = MeshBuilder.CreatePlane('sponsor3', {
            width: sponsor_width,
            height: sponsor_height
        }, this.scene);

        const logo4 = MeshBuilder.CreatePlane('sponsor4', {
            width: sponsor_width,
            height: 7
        }, this.scene);

        const logo5 = MeshBuilder.CreatePlane('sponsor5', {
            width: sponsor_width,
            height: 7
        }, this.scene);

        // Create material for sponsorships

        // Bud Light
        const sponsorMaterial = new StandardMaterial('sponsorMaterial', this.scene);
        const sponsorTexture = new Texture('./Bud-Light-Logo.png', this.scene);
        sponsorTexture.hasAlpha = true;
        sponsorMaterial.diffuseTexture = sponsorTexture;
        sponsorMaterial.backFaceCulling = false;
        sponsorMaterial.specularColor = new Color3(0.5, 0.5, 0.5);
        sponsorMaterial.specularPower = 1;

        // Yuengling FLIGHT
        const sponsorMaterial2 = new StandardMaterial('sponsorMaterial2', this.scene);
        const sponsorTexture2 = new Texture('./yuengling-logo.png', this.scene);
        sponsorTexture2.hasAlpha = true;
        sponsorTexture2.wAng = Math.PI; // Flip the texture over Y axis
        sponsorTexture2.uAng = Math.PI;
        sponsorMaterial2.diffuseTexture = sponsorTexture2;
        sponsorMaterial2.backFaceCulling = false;
        sponsorMaterial2.specularColor = new Color3(0.5, 0.5, 0.5); 
        sponsorMaterial2.specularPower = 1;


        // Apply material to all sponsor meshes
        logo1.material = sponsorMaterial;
        logo2.material = sponsorMaterial;
        logo3.material = sponsorMaterial;
        logo4.material = sponsorMaterial2;
        logo5.material = sponsorMaterial2;

        const z_position = -72;
        const y_position = 4.75;
        // Position the meshes (you can adjust these values)
        logo1.position = new Vector3(-50, y_position, z_position);
        logo2.position = new Vector3(0, y_position, z_position);
        logo3.position = new Vector3(50, y_position, z_position);
        logo4.position = new Vector3(-25, y_position, z_position);
        logo5.position = new Vector3(25, y_position, z_position);

        // Rotate to face forward
        logo1.rotation.y = Math.PI;
        logo2.rotation.y = Math.PI;
        logo3.rotation.y = Math.PI;
    }

    protected setupLights(): void {
        const ambientLight = new HemisphericLight('ambientLight', new Vector3(0, 25, 0), this.scene);
        ambientLight.intensity = 0.4;
        ambientLight.groundColor = new Color3(0.549, 0.596, .639);
        ambientLight.diffuse = new Color3(0.78, 0.894, 1);

        // Light behind the helmets
        const spotLight = new PointLight('spotLight', new Vector3(0, 8, -23), this.scene);
        spotLight.intensity = 0.9;
        spotLight.diffuse = new Color3(.933, 0.969, 1);
        spotLight.specular = new Color3(.933, 0.969, 1);
        spotLight.radius = 4.5;
        spotLight.range = 23;

        const topLight = new SpotLight('topLight', new Vector3(0, 10, 0), new Vector3(0, -1, 0), Math.PI / 2, 1, this.scene);
        topLight.intensity = 0.7;
        topLight.diffuse = new Color3(0.9, 0.8, 0.6);
        topLight.specular = new Color3(0.9, 0.8, 0.6);
        topLight.radius = 4;
        topLight.range = 12;


        // Array of lights that light up the back of the rink 
        for (let i = 0; i < 6; i++) {
            const light = new PointLight('backLight', new Vector3(-50 + (i * 20), 10, -50), this.scene);
            light.intensity = 0.6;
            light.diffuse = new Color3(0.859, 0.91, 0.961);
            light.specular = new Color3(0.9, 0.8, 0.6);
            light.radius = 0.1;
            light.range = 18;
        }
        
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
        await this.cupLine.guessingPhase();
    }


    protected async revealCoupon(): Promise<void> {
        if (!this.cupLine) return;
        await this.cupLine.displayCouponPhase();
    }

    protected async resetRound(): Promise<void> {
        if (!this.cupLine) return;
        //await this.cupLine.updateShuffleParameters();
        await this.cupLine.resetLine();
    }

    public dispose(): void {
        if (this.stateCheckInterval) {
            clearInterval(this.stateCheckInterval);
            this.stateCheckInterval = null;
        }
        super.dispose();
    }
} 