import { Vector3, HemisphericLight, Color3, Color4, Engine, KeyboardEventTypes, ArcRotateCamera } from '@babylonjs/core';
import { SceneContainer } from '../../core/SceneContainer';
import { PlayerChoiceEntity } from '../../components/PlayerChoiceEntity';
import { Player } from '../../config/Player';
import type { ClientRoom, HostRoom } from '../../../sdk_extension_logic/client';
import type { GameState, PlayerState } from '../../../sdk_extension_logic/schema';
export class ChoiceEntityDebugScene extends SceneContainer {
    private playerChoice: PlayerChoiceEntity;
    private debugPlayers: Player[] = [
        new Player("Player 1", new Color3(1, 0, 0)),    // Red
        new Player("Player 2", new Color3(0, 0, 1)),    // Blue
        new Player("Player 3", new Color3(0, 1, 0)),    // Green
        new Player("Player 4", new Color3(1, 1, 0)),    // Yellow
        new Player("Player 5", new Color3(1, 0, 1))     // Purple
    ];
    private currentPlayerIndex: number = 0;

    constructor(engine: Engine, canvas: HTMLCanvasElement, room: ClientRoom | HostRoom) {
        super(engine, canvas, room);
        this.playerChoice = new PlayerChoiceEntity(this.scene, new Vector3(0, 0, 0));
    }

    public async initialize(): Promise<void> {
        this.scene.clearColor = new Color4(0.1, 0.1, 0.15, 1);
        this.setupCamera();
        this.setupLights();
        this.setupEnvironment();
        this.setupPlayerChoice();
        this.debugPlayerChoice();
    }

    protected setupCamera(): void {
        this.camera = new ArcRotateCamera("Camera", Math.PI / 2, 0, 0, new Vector3(0, 0, 0));
        this.camera.attachControl(this.canvas, true);   
    }

    protected setupLights(): void {
        // Basic lighting
        const light = new HemisphericLight("light1", new Vector3(0, 1, 0), this.scene);
        light.intensity = 0.5;
    }

    protected setupEnvironment(): void {
        
    }

    protected onGameStateChanged(state: GameState<PlayerState>): void {
        console.log("Game state changed:", state);
    }
    
    protected setupPlayerChoice(): void {
        this.playerChoice = new PlayerChoiceEntity(this.scene, new Vector3(0, 0, 0));
        this.playerChoice.initialize();
    }

    protected debugPlayerChoice(): void {
        // A key will add next player, S key will remove last player
        this.scene.onKeyboardObservable.add((kbInfo) => {
            if (kbInfo.type === KeyboardEventTypes.KEYDOWN) {
                switch (kbInfo.event.key) {
                    case 'a':
                        if (this.currentPlayerIndex < this.debugPlayers.length) {
                            this.playerChoice.addPlayer(this.debugPlayers[this.currentPlayerIndex]);
                            this.currentPlayerIndex++;
                        }
                        break;
                    case 's':
                        if (this.currentPlayerIndex > 0) {
                            this.currentPlayerIndex--;
                            this.playerChoice.removePlayer(this.debugPlayers[this.currentPlayerIndex]);
                        }
                        break;
                }
            }
        });
    }
        
}