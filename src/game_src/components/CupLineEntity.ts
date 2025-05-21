import { Scene, Vector3 } from '@babylonjs/core';
import { CupEntity } from './CupEntity';
import { PlayerChoiceEntity } from './PlayerChoiceEntity';
import type { GameState, MessagePayloads, MessageType } from '../../sdk_extension_logic/schema';
import type { PlayerState } from '../../sdk_extension_logic/schema';
import { BaseHostRoom } from '../../sdk';

export class CupLineEntity {
    private scene: Scene;

    private cups: CupEntity[];
    private choice_entities: PlayerChoiceEntity[];
    

    public position: Vector3;
    public number_of_cups: number;
    public shuffle_duration: number;
    public shuffle_pace_base: number;
    public shuffle_pace_variance: number;
    public line_length: number;

    private start_position: Vector3;
    private end_position: Vector3;
    private room: BaseHostRoom<GameState<PlayerState>, PlayerState, MessageType, MessagePayloads>;

    constructor(scene: Scene, position: Vector3, room: BaseHostRoom<GameState<PlayerState>, PlayerState, MessageType, MessagePayloads>) {
        this.scene = scene;
        this.position = position;
        this.number_of_cups = room.state.number_of_cups;
        this.shuffle_duration = room.state.shuffle_duration;
        this.shuffle_pace_base = room.state.shuffle_pace_base;
        this.shuffle_pace_variance = room.state.shuffle_pace_variance;
        this.line_length = 11;
        this.start_position = new Vector3(-this.line_length / 2, 0.75, 0);
        this.end_position = new Vector3(this.line_length / 2, 0.75, 0);
        this.cups = [];
        this.choice_entities = [];
        this.room = room;
    }

    public async initialize(): Promise<void> {
        // Place the cups in the line
        this.cups = [];
        const cup_spacing = this.line_length / (this.number_of_cups - 1);
        for (let i = 0; i < this.number_of_cups; i++) {
            const position = this.start_position.clone().add(new Vector3(cup_spacing * i, 0, 0));
            const cup = new CupEntity(this.scene, position, 'cup' + i, false, i);
            this.cups.push(cup);
            const choice_entity = new PlayerChoiceEntity(this.scene, position);
            choice_entity.enable();
            this.choice_entities.push(choice_entity);
        }
    }

    public async displayCouponPhase(): Promise<void> {
        this.cups[this.room.state.starting_cup].setCorrect(true);
        await this.cups[this.room.state.starting_cup].revealContents();
    }

    public async guessingPhase(room: BaseHostRoom<GameState<PlayerState>, PlayerState, MessageType, MessagePayloads>): Promise<void> {
        // Enable all choice entities
        for (let i = 0; i < this.number_of_cups; i++) {
            this.choice_entities[i].enable();
        }

        // Create a promise that resolves after 10 seconds
        return new Promise((resolve) => {
            const startTime = Date.now();
            const votingDuration = 10000; // 10 seconds

            const updateVotes = async () => {
                const currentTime = Date.now();
                const elapsedTime = currentTime - startTime;

                if (elapsedTime < votingDuration) {
                    // Update votes every frame
                    await this.readVotes(room.state.players); // Empty array for now, will be populated later
                    requestAnimationFrame(() => updateVotes());
                } else {
                    // Final vote update
                    await this.readVotes(room.state.players);
                    resolve();
                }
            };

            // Start the update loop
            updateVotes();
        });
    }

    public async resetLine(): Promise<void> {
        for (let i = 0; i < this.number_of_cups; i++) {
            this.cups[i].setOpenable(false);
            this.cups[i].setCorrect(false);
        }

        // Clear choice entities
        await this.clearChoiceEntities();
    }

    public async changeCupLineParameters(new_parameters: {numberOfCups: number, shuffleDuration: number, shufflePaceBase: number, shufflePaceVariance: number}): Promise<void> {
        this.number_of_cups = new_parameters.numberOfCups;
        this.shuffle_duration = new_parameters.shuffleDuration;
        this.shuffle_pace_base = new_parameters.shufflePaceBase;
        this.shuffle_pace_variance = new_parameters.shufflePaceVariance;

        // Reset cups and choice entities
        await this.resetLine();

        // Update the correct cup index'
        this.room.state.starting_cup = Math.floor(Math.random() * this.number_of_cups);
        this.cups[this.room.state.starting_cup].setCorrect(true);
    }

    public async shuffleLinePhase(): Promise<void> {
        console.log("Shuffling line phase");
        
        // Safety check - ensure shuffle_sequence exists and has elements
        if (!this.room.state.shuffle_sequence || !Array.isArray(this.room.state.shuffle_sequence) || this.room.state.shuffle_sequence.length === 0) {
            console.warn("No shuffle sequence found in state, skipping shuffle");
            return;
        }
        
        try {
            // For each pair in the sequence, shuffle the cups
            for (const sequence of this.room.state.shuffle_sequence) {
                if (!Array.isArray(sequence) || sequence.length !== 2) {
                    console.warn("Invalid shuffle sequence entry:", sequence);
                    continue;
                }
                
                const index1 = sequence[0];
                const index2 = sequence[1];
                
                // Validate indices
                if (index1 < 0 || index1 >= this.cups.length || index2 < 0 || index2 >= this.cups.length) {
                    console.warn(`Invalid cup indices: ${index1}, ${index2} (max: ${this.cups.length - 1})`);
                    continue;
                }
                
                console.log(`Shuffling cups at indices: ${index1}, ${index2}`);
                const cup1 = this.cups[index1];
                const cup2 = this.cups[index2];
                
                if (!cup1 || !cup2) {
                    console.warn(`Cups not found at indices: ${index1}, ${index2}`);
                    continue;
                }
                
                await this.shuffleCupPair(cup1, cup2, this.cups);
            }
        } catch (error) {
            console.error("Error during cup shuffling:", error);
        }
    }

    private async shuffleCupPair(cup1: CupEntity, cup2: CupEntity, cup_array: CupEntity[]): Promise<void> {
        try {
            const cup1_position = cup1.getPosition();
            const cup2_position = cup2.getPosition();
                
            // Use Promise.all to maintain scene rendering and move cups simultaneously
            const shuffle_pace = this.room.state.current_shuffle_parameters.shuffle_pace_base + 
                Math.random() * this.room.state.current_shuffle_parameters.shuffle_pace_variance;
            
            await Promise.all([
                cup1.shuffleTo(cup2_position, shuffle_pace, true),
                cup2.shuffleTo(cup1_position, shuffle_pace, false)
            ]);
            
            // Swap cups in the array
            const index1 = cup_array.indexOf(cup1);
            const index2 = cup_array.indexOf(cup2);
            
            // Swap the cups in the array
            [cup_array[index1], cup_array[index2]] = [cup_array[index2], cup_array[index1]];
        } catch (error) {
            console.error("Error in shuffleCupPair:", error);
        }
    }

    private async clearChoiceEntities(): Promise<void> {
        for (let i = 0; i < this.choice_entities.length; i++) {
            this.choice_entities[i].clear();
        }
    }

    private async readVotes(players: Record<string, PlayerState>): Promise<void> {
        // Input is a list of players and their votes. For each vote, assign the player to the correct choice entity.
        // Clear the choice entities first
        await this.clearChoiceEntities();
        for (const player of Object.values(players)) {
            const vote = player.selectedCup;
            if (player.isEliminated) {
                continue;
            } else {
                this.choice_entities[vote].addPlayer(player);   
            }
        }
    }

}