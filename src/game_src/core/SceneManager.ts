import { Engine } from '@babylonjs/core';
import { SceneContainer } from './SceneContainer';
import { CupShuffleScene } from '../scenes/CupShuffleScene';
//import { RefactorWorldEntityDebugScene } from '../scenes/RefactorWorldEntityDebugScene';
import { BaseHostRoom } from '../../sdk';
import type { GameState, PlayerState, MessageType, MessagePayloads } from '../../sdk_extension_logic/schema';

export class SceneManager {
    private engine: Engine;
    private canvas: HTMLCanvasElement;
    private currentScene: SceneContainer | null = null;
    private scenes: Map<string, SceneContainer> = new Map();
    private room: BaseHostRoom<GameState<PlayerState>, PlayerState, MessageType, MessagePayloads>;

    constructor(engine: Engine, canvas: HTMLCanvasElement, room: BaseHostRoom<GameState<PlayerState>, PlayerState, MessageType, MessagePayloads>) {
        this.engine = engine;
        this.canvas = canvas;
        this.room = room;
    }

    public async initialize(): Promise<void> {
        // Create and register the game scene
        const gameScene = new CupShuffleScene(this.engine, this.canvas, this.room);
        //const refactorWorldEntityDebugScene = new RefactorWorldEntityDebugScene(this.engine, this.canvas, this.room);
        //const debugScene = new ChoiceEntityDebugScene(this.engine, this.canvas);
        //const cupLineDebugScene = new CupLineEntityDebugScene(this.engine, this.canvas);
        this.registerScene('game', gameScene);
        //this.registerScene('refactorWorldEntityDebug', refactorWorldEntityDebugScene);
        //this.registerScene('debug', debugScene);
        //this.registerScene('cupLineDebug', cupLineDebugScene);
        
        // Load the game scene as the initial scene
        await this.loadScene('game');
        //await this.loadScene('game');
        //await this.loadScene('debug');  
        //await this.loadScene('cupLineDebug');
    }

    public getCurrentScene(): SceneContainer | null {
        return this.currentScene;
    }

    public async loadScene(sceneId: string): Promise<void> {
        // Dispose current scene if it exists
        if (this.currentScene) {
            this.currentScene.dispose();
        }

        const nextScene = this.scenes.get(sceneId);
        if (!nextScene) {
            throw new Error(`Scene ${sceneId} not found`);
        }

        this.currentScene = nextScene;
        await this.currentScene.initialize();
    }

    public registerScene(sceneId: string, scene: SceneContainer): void {
        this.scenes.set(sceneId, scene);
    }
} 