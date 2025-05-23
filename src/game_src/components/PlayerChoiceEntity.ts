import { Mesh, Scene, MeshBuilder, Vector3, StandardMaterial, Color3 } from '@babylonjs/core';
import type { PlayerState } from '../../sdk_extension_logic/schema';

export class PlayerChoiceEntity {
    private scene: Scene;
    private players: PlayerState[];
    private number_of_players: number;
    private position: Vector3;
    private INITIAL_POSITION_OFFSET: Vector3;
    private DECISION_POSITION_OFFSET: Vector3;
    private decision_meshes: Mesh[];
    // Tracks whether the choice entity is currently enabled
    private enabled: boolean;

    constructor(scene: Scene, position: Vector3) {
        this.scene = scene;
        this.players = [];
        this.number_of_players = 0;
        this.position = position;
        this.INITIAL_POSITION_OFFSET = position.clone().add(new Vector3(0, 0.2, 1.4));
        this.DECISION_POSITION_OFFSET = new Vector3(0, 0, 1.0);
        this.decision_meshes = [];
        this.enabled = false;
    }

    public async initialize(): Promise<void> {
        // TODO: Implement this
        // Create a small white sphere at the position
        const sphere = MeshBuilder.CreateSphere("player_choice", { diameter: 0.03 }, this.scene);
        sphere.position = this.position;
        const material = new StandardMaterial("player_material", this.scene);
        material.diffuseColor = new Color3(1, 1, 1);
        sphere.material = material;
        this.decision_meshes.push(sphere);
    }

    // Make meshes visible
    public enable(): void {
        this.enabled = false;
        this.decision_meshes.forEach(mesh => mesh.setEnabled(this.enabled));
    }

    // Make meshes invisible
    public disable(): void {
        this.enabled = false;
        this.decision_meshes.forEach(mesh => mesh.setEnabled(this.enabled));
    }
    
    public addPlayer(player: PlayerState): void {
        this.players.push(player);
        this.number_of_players++;
        this.createDecisionMesh(player);
    }

    public removePlayer(player: PlayerState): void {
        if (this.number_of_players > 0) {
            //console.log("Removing player", player);
            this.players = this.players.filter(p => p !== player);
            this.deleteDecisionMesh();
            this.number_of_players--;
        }
    }

    public clear(): void {
        this.players = [];
        this.decision_meshes.forEach(mesh => mesh.dispose());
        this.decision_meshes = [];
        this.number_of_players = 0;
        this.disable();
    }

    // Extend mesh out from the position
    private createDecisionMesh(player: PlayerState): Mesh {
        const mesh = MeshBuilder.CreateSphere("player_choice", { diameter: 1 }, this.scene);
        const decision_position = this.INITIAL_POSITION_OFFSET.clone().add(this.DECISION_POSITION_OFFSET.multiplyByFloats(this.number_of_players, this.number_of_players, this.number_of_players));
        mesh.position = decision_position;
        
        const material = new StandardMaterial("player_material", this.scene);
        material.diffuseColor = Color3.FromHexString(player.color);
        mesh.material = material;

        this.decision_meshes.push(mesh);
        return mesh;
    }

    // Delete the farthest mesh
    private deleteDecisionMesh(): void {
        this.decision_meshes[this.decision_meshes.length - 1].dispose();
        this.decision_meshes.pop();
        
    }

    // Getter for the enabled state
    public isEnabled(): boolean {
        return this.enabled;
    }
}
