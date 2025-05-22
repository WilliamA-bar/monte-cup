import { BaseWorldModel } from "../../sdk_extension_logic/schema";
import { Mesh, MeshBuilder, Scene } from "@babylonjs/core";

export class RefactoredEntity {

    private model: BaseWorldModel;
    private mesh: Mesh;
    private scene: Scene;

    constructor(model: BaseWorldModel, scene: Scene) {
        this.model = model;
        this.mesh = MeshBuilder.CreateBox(model.getId(), { size: 1 }, scene);
        this.scene = scene;
    }

    public update(deltaTime: number, model: BaseWorldModel): void {
        this.mesh.position.y = model.getPosition().y;
        this.model = model;
        console.log("deltaTime", deltaTime);
    }

    public getMesh(): Mesh {
        return this.mesh;
    }

    public getModel(): BaseWorldModel {
        return this.model;
    }

    public getScene(): Scene {
        return this.scene;
    }

}
