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
    private cup_shuffle_positions: Vector3[];
    

    public position: Vector3;
    public line_length: number;

    private start_position: Vector3;
    private room: BaseHostRoom<GameState<PlayerState>, PlayerState, MessageType, MessagePayloads>;

    constructor(scene: Scene, position: Vector3, room: BaseHostRoom<GameState<PlayerState>, PlayerState, MessageType, MessagePayloads>) {
        this.scene = scene;
        this.position = position;
        this.line_length = 9;
        this.start_position = new Vector3(-this.line_length / 2, 0.75, 0);
        this.cups = [];
        this.choice_entities = [];
        this.cup_shuffle_positions = [];
        this.room = room;
    }

    public async initialize(): Promise<void> {
        // Place the cups in the line

        this.cups = [];
        const cup_spacing = this.line_length / (this.room.state.current_shuffle_parameters.number_of_cups - 1);
        
        // Create all cups first
        for (let i = 0; i < this.room.state.current_shuffle_parameters.number_of_cups; i++) {
            const position = this.start_position.clone().add(new Vector3(cup_spacing * i, 0, 0));
            const cup = new CupEntity(this.scene, position, 'cup' + i, i);
            this.cups.push(cup);
            this.cup_shuffle_positions.push(position.clone());
        }

        // Initialize all cups in parallel
        await Promise.all(this.cups.map(cup => cup.initialize()));
    }
    

    public async displayCouponPhase(): Promise<void> {
        await this.cups[this.room.state.starting_cup].revealContents();
    }

    public async guessingPhase(): Promise<void> {
        // Enable all choice entities
        for (let i = 0; i < this.room.state.current_shuffle_parameters.number_of_cups; i++) {
            //this.choice_entities[i].enable(); For the dallas stars demo, choice entities are not enabled
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
                    await this.readVotes(this.room.state.players); // Empty array for now, will be populated later
                    requestAnimationFrame(() => updateVotes());
                } else {
                    // Final vote update
                    await this.readVotes(this.room.state.players);
                    resolve();
                }
            };

            // Start the update loop
            updateVotes();
        });
    }

    public async resetLine(): Promise<void> {

        // Clear choice entities
        await this.clearChoiceEntities();
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
                
                const cup1 = this.cups[index1];
                const cup2 = this.cups[index2];
                
                if (!cup1 || !cup2) {
                    console.warn(`Cups not found at indices: ${index1}, ${index2}`);
                    continue;
                }
                
                await this.shuffleCupPair(cup1, cup2);
            }
        } catch (error) {
            console.error("Error during cup shuffling:", error);
        }
    }

    public async updateShuffleParameters(): Promise<void> {
        // First, store the new parameters


        // Delete all cups, and reinitialize them
        for (let i = 0; i < this.cups.length; i++) {
            this.cups[i].dispose();
        }
        this.cups = [];
        await this.initialize();
        
    }


    private async shuffleCupPair(cup1: CupEntity, cup2: CupEntity): Promise<void> {
        try {
            // Grab cup indexes
            const index1 = this.cups.indexOf(cup1);
            const index2 = this.cups.indexOf(cup2);

            const shuffle_target_position1 = this.cup_shuffle_positions[index2];
            const shuffle_target_position2 = this.cup_shuffle_positions[index1];


            // Use Promise.all to maintain scene rendering and move cups simultaneously
            const shuffle_pace = this.room.state.current_shuffle_parameters.shuffle_pace_base + 
                Math.random() * this.room.state.current_shuffle_parameters.shuffle_pace_variance;
            
            await Promise.all([
                cup1.shuffleTo(shuffle_target_position1, shuffle_pace, true),
                cup2.shuffleTo(shuffle_target_position2, shuffle_pace, false)
            ]);
            
            // Swap cups in the array
            
            
            // Swap the cups in the array
            [this.cups[index1], this.cups[index2]] = [this.cups[index2], this.cups[index1]];
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