import { Scene, AssetsManager, MeshAssetTask, TextureAssetTask, AbstractMesh, Texture } from '@babylonjs/core';

export class AssetManager {
    private loadedAssets: Map<string, AbstractMesh | Texture> = new Map();

    constructor() {}

    public async initialize(): Promise<void> {
        // Initialize with any default assets
    }

    public async loadAssets(scene: Scene, assets: Array<{id: string, url: string, type: 'mesh' | 'texture'}>): Promise<void> {
        return new Promise((resolve, reject) => {
            const assetsManager = new AssetsManager(scene);

            assets.forEach(asset => {
                if (asset.type === 'mesh') {
                    const meshTask = assetsManager.addMeshTask(asset.id, '', '', asset.url);
                    meshTask.onSuccess = (task: MeshAssetTask) => {
                        this.loadedAssets.set(asset.id, task.loadedMeshes[0]);
                    };
                } else if (asset.type === 'texture') {
                    const textureTask = assetsManager.addTextureTask(asset.id, asset.url);
                    textureTask.onSuccess = (task: TextureAssetTask) => {
                        this.loadedAssets.set(asset.id, task.texture);
                    };
                }
            });

            assetsManager.onFinish = () => resolve();
            assetsManager.onTaskError = (task) => {
                reject(new Error(`Failed to load asset: ${task.name}`));
            };
            
            assetsManager.load();
        });
    }

    public getAsset(id: string): AbstractMesh | Texture | undefined {
        return this.loadedAssets.get(id);
    }
} 