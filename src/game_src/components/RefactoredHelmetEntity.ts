import { Scene } from "@babylonjs/core";
import { HemletModel, BaseWorldModel } from "../../sdk_extension_logic/schema";
import { RefactoredEntity } from "./RefactoredEntity";

export class RefactoredHelmetEntity extends RefactoredEntity {

    private helmet_entity: BaseWorldModel;

    constructor(state_helmet_entity: HemletModel, scene: Scene) {
        super(state_helmet_entity, scene);
        this.helmet_entity = state_helmet_entity;
    }

    public update(deltaTime: number, model: HemletModel): void {
        super.update(deltaTime, model);
        console.log("Updating helmet entity", deltaTime);
        this.helmet_entity.setPosition(model.getPosition());
    }

}