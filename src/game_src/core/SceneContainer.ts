import { Scene, Engine, Camera } from '@babylonjs/core';
import { BaseHostRoom } from '../../sdk';
import type { GameState, PlayerState, MessageType, MessagePayloads } from '../../sdk_extension_logic/schema';
export abstract class SceneContainer {
    protected scene: Scene;
    protected engine: Engine;
    protected canvas: HTMLCanvasElement;
    protected camera: Camera | null = null;
    protected room: BaseHostRoom<GameState<PlayerState>, PlayerState, MessageType, MessagePayloads>;

    constructor(engine: Engine, canvas: HTMLCanvasElement, room: BaseHostRoom<GameState<PlayerState>, PlayerState, MessageType, MessagePayloads>) {
        this.engine = engine;
        this.canvas = canvas;
        this.scene = new Scene(this.engine);
        this.room = room;
    }

    public abstract initialize(): Promise<void>;

    public render(): void {
        this.scene.render();
    }

    public dispose(): void {
        this.scene.dispose();
    }

    protected abstract setupCamera(): void;
    protected abstract setupLights(): void;
    protected abstract setupEnvironment(): void;
    
    /**
     * Called whenever the game state changes.
     * Child scenes should implement this to react to state changes.
     * @param state The current state of the game
     */
    protected abstract onGameStateChanged(state: GameState<PlayerState>): void;
} 