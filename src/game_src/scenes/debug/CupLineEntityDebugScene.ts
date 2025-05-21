import { Engine, Vector3, ArcRotateCamera, HemisphericLight, Color4 } from "@babylonjs/core";
import { CupLineEntity } from "../../components/CupLineEntity";
import { SceneContainer } from "../../core/SceneContainer";
import { AdvancedDynamicTexture, StackPanel, InputText, Button, TextBlock } from "@babylonjs/gui";
import { KeyboardEventTypes } from "@babylonjs/core";
import { BaseHostRoom } from "../../../sdk";
import { GameState, MessagePayloads, MessageType, PlayerState } from "../../../sdk_extension_logic/schema";

export class CupLineEntityDebugScene extends SceneContainer {
    private cupLine!: CupLineEntity;
    private parameters = {
        numberOfCups: 3,
        shuffleDuration: 5,
        shufflePaceBase: 0.4,
        shufflePaceVariance: 0.1
    };
    private isOperationInProgress: boolean = false;

    constructor(engine: Engine, canvas: HTMLCanvasElement) {
        // Create a mock room for debug purposes
        const mockRoom = {
            state: {
                number_of_cups: 3,
                shuffle_duration: 5,
                shuffle_pace_base: 0.4,
                shuffle_pace_variance: 0.1,
                starting_cup: 0,
                shuffle_sequence: [],
                current_shuffle_parameters: {
                    shuffle_pace_base: 0.4,
                    shuffle_pace_variance: 0.1
                },
                players: {},
            } as unknown as GameState<PlayerState>,
            roomId: "debug-room",
        } as unknown as BaseHostRoom<GameState<PlayerState>, PlayerState, MessageType, MessagePayloads>;
        
        super(engine, canvas, mockRoom);
    }

    public async initialize(): Promise<void> {
        this.scene.clearColor = new Color4(0.1, 0.1, 0.15, 1);
        this.setupCamera();
        this.setupLights();
        this.setupEnvironment();
        // Start rendering before showing UI
        this.engine.runRenderLoop(() => {
            this.scene.render();
        });
        await this.inputCupLineParameters();
        this.setupCupLine();
        this.debugCupLine();
    }

    protected setupCamera(): void {
        this.camera = new ArcRotateCamera("Camera", Math.PI / 2, Math.PI / 3, 15, Vector3.Zero(), this.scene);
        this.camera.attachControl(this.canvas, true);
    }

    protected setupLights(): void {
        new HemisphericLight("light", new Vector3(0, 1, 0), this.scene);
    }

    protected setupEnvironment(): void {
        // No environment setup needed for debug scene
    }

    protected onGameStateChanged(state: GameState<PlayerState>): void {
        console.log("Game state changed:", state);
    }

    protected async inputCupLineParameters(): Promise<void> {
        return new Promise((resolve) => {
            const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI");
            
            const panel = new StackPanel();
            panel.width = "300px";
            panel.spacing = 10;
            panel.horizontalAlignment = StackPanel.HORIZONTAL_ALIGNMENT_CENTER;
            panel.verticalAlignment = StackPanel.VERTICAL_ALIGNMENT_CENTER;
            panel.background = "#454545";
            panel.paddingTop = "20px";
            panel.paddingBottom = "20px";
            advancedTexture.addControl(panel);

            // Title
            const title = new TextBlock();
            title.text = "Cup Line Parameters";
            title.height = "40px";
            title.color = "white";
            title.fontSize = 20;
            panel.addControl(title);

            // Number of Cups Input
            const cupsInput = new InputText();
            cupsInput.width = "200px";
            cupsInput.height = "40px";
            cupsInput.color = "white";
            cupsInput.background = "#666666";
            cupsInput.text = this.parameters.numberOfCups.toString();
            cupsInput.placeholderText = "Number of Cups";
            panel.addControl(cupsInput);

            // Shuffle Duration Input
            const durationInput = new InputText();
            durationInput.width = "200px";
            durationInput.height = "40px";
            durationInput.color = "white";
            durationInput.background = "#666666";
            durationInput.text = this.parameters.shuffleDuration.toString();
            durationInput.placeholderText = "Shuffle Duration (seconds)";
            panel.addControl(durationInput);

            // Shuffle Pace Base Input
            const paceInput = new InputText();
            paceInput.width = "200px";
            paceInput.height = "40px";
            paceInput.color = "white";
            paceInput.background = "#666666";
            paceInput.text = this.parameters.shufflePaceBase.toString();
            paceInput.placeholderText = "Shuffle Pace Base";
            panel.addControl(paceInput);

            // Shuffle Pace Variance Input
            const varianceInput = new InputText();
            varianceInput.width = "200px";
            varianceInput.height = "40px";
            varianceInput.color = "white";
            varianceInput.background = "#666666";
            varianceInput.text = this.parameters.shufflePaceVariance.toString();
            varianceInput.placeholderText = "Shuffle Pace Variance";
            panel.addControl(varianceInput);

            // Start Button
            const startButton = Button.CreateSimpleButton("start", "Start");
            startButton.width = "140px";
            startButton.height = "40px";
            startButton.color = "white";
            startButton.cornerRadius = 20;
            startButton.background = "green";
            startButton.onPointerUpObservable.add(() => {
                this.parameters.numberOfCups = parseInt(cupsInput.text);
                this.parameters.shuffleDuration = parseFloat(durationInput.text);
                this.parameters.shufflePaceBase = parseFloat(paceInput.text);
                this.parameters.shufflePaceVariance = parseFloat(varianceInput.text);
                advancedTexture.dispose();
                resolve();
            });
            panel.addControl(startButton);
        });
    }

    protected setupCupLine(): void {
        this.cupLine = new CupLineEntity(
            this.scene,
            new Vector3(0, 0, 0),
            this.room
        );
        this.cupLine.initialize();
    }

    protected debugCupLine(): void {
        this.scene.onKeyboardObservable.add((kbInfo) => {
            if (kbInfo.type === KeyboardEventTypes.KEYDOWN) {
                switch (kbInfo.event.key) {
                    case 'd': // Display coupon
                        if (this.isOperationInProgress) {
                            return;
                        }
                        this.isOperationInProgress = true;
                        console.log("Displaying coupon...");
                        this.cupLine.displayCouponPhase().then(() => {
                            console.log("Coupon displayed");
                            this.isOperationInProgress = false;
                        }).catch(error => {
                            console.error("Error displaying coupon:", error);
                            this.isOperationInProgress = false;
                        });
                        break;
                    case 's': // Start shuffle
                        if (this.isOperationInProgress) {
                            return;
                        }
                        this.isOperationInProgress = true;
                        console.log("Starting shuffle...");
                        this.cupLine.shuffleLinePhase().then(() => {
                            console.log("Shuffle complete");
                            this.isOperationInProgress = false;
                        }).catch(error => {
                            console.error("Error during shuffle:", error);
                            this.isOperationInProgress = false;
                        });
                        break;
                    case 'g': // Guessing phase
                        if (this.isOperationInProgress) {
                            return;
                        }
                        this.isOperationInProgress = true;
                        console.log("Starting guessing phase...");
                        this.cupLine.guessingPhase(this.room).then(() => {
                            console.log("Guessing phase complete");
                            this.isOperationInProgress = false;
                        }).catch(error => {
                            console.error("Error during guessing phase:", error);
                            this.isOperationInProgress = false;
                        });
                        break;
                    case 'r': // Reset
                        if (this.isOperationInProgress) {
                            return;
                        }
                        this.isOperationInProgress = true;
                        console.log("Resetting cup line...");
                        // Dispose current cup line and create a new one
                        this.cupLine.resetLine().then(() => {
                            console.log("Reset complete");
                            this.isOperationInProgress = false;
                        }).catch(error => {
                            console.error("Error during reset:", error);
                            this.isOperationInProgress = false;
                        });
                        break;
                    case 'c': // Clear
                        console.log("Clear key pressed");
                        break;
                }
            }
        });
    }
}
