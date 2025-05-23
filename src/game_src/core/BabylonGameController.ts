import { Engine } from '@babylonjs/core';
import { SceneManager } from './SceneManager';
import { BaseHostRoom } from '../../sdk';
import type { GameState, PlayerState, MessageType, MessagePayloads } from '../../sdk_extension_logic/schema';
import type { IGameController } from './IGameController';

/**
 * BabylonJS implementation of the game controller.
 * Manages both the rendering engine (BabylonJS) and game-specific logic.
 */
export class BabylonGameController implements IGameController {
    private canvas: HTMLCanvasElement;
    private engine: Engine;
    private sceneManager: SceneManager;
    private room: BaseHostRoom<GameState<PlayerState>, PlayerState, MessageType, MessagePayloads>;

    constructor(canvas: HTMLCanvasElement, room: BaseHostRoom<GameState<PlayerState>, PlayerState, MessageType, MessagePayloads>) {
        this.canvas = canvas;
        this.engine = new Engine(this.canvas, true);
        this.room = room;

        this.sceneManager = new SceneManager(this.engine, this.canvas, this.room);

        // Set up room state listeners
        this.room.onStateChange((newState) => {
            console.log('[Client] Room state changed:', newState);
            // TODO: Respond to state changes
        });

        this.room.onPlayerAdd((player) => {
            console.log('[Client] Player added:', player);
            // TODO: Respond to player additions
        });

        this.room.onPlayerRemove((player) => {
            console.log('[Client] Player removed:', player);
            // TODO: Respond to player removals
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            this.engine.resize();
        });
    }

    public async initialize(): Promise<void> {
        // Initialize assets and scenes
        //await this.assetManager.initialize();
        await this.sceneManager.initialize();
    }

    public async start(): Promise<void> {
        await this.initialize();
        
        // Start the render loop
        const currentScene = this.sceneManager.getCurrentScene();
        if (currentScene) {
            this.engine.runRenderLoop(() => {
                currentScene.render();
            });
        }
    }

    public async stop(): Promise<void> {
        this.engine.stopRenderLoop();
    }

    public dispose(): void {
        this.stop();
        this.engine.dispose();
    }
} 