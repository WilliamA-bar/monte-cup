// DEPRECATED

// This class is no longer used, and is replaced by the GameState class in the sdk_extension_logic folder


import { Color3 } from '@babylonjs/core';
import { Player, PlayerStats } from './Player';
import CustomState from './CustomState.json';

interface PlayerStateData {
    name: string;
    color: {
        r: number;
        g: number;
        b: number;
    };
    stats: PlayerStats;
    isEliminated: boolean;
    selectedCup: number;
}

interface CustomStateType {
    cup_line_parameters?: {
        numberOfCups: number;
        shuffleDuration: number;
        shufflePaceBase: number;
        shufflePaceVariance: number;
    };
    decision_phase_duration?: number;
    round_number?: number;
    players?: PlayerStateData[];
}

export enum RoundPhases {
    DisplayCoupon,
    ShuffleCups,
    GuessingPhase,
    RevealCoupon,
    EndRound,
    Reset
}

//example for calling game data: game_data.round_number

export class GameStateContainer {
    private _round_number: number = 1;
    private _round_phase: RoundPhases = RoundPhases.DisplayCoupon;
    private _players: Player[] = [];
    private _decision_phase_duration: number = 10;
    private _cup_line_parameters = {
        numberOfCups: 3,
        shuffleDuration: 5,
        shufflePaceBase: 0.4,
        shufflePaceVariance: 0.1
    };
    private _choice_update_interval: NodeJS.Timeout | null = null;

    // Public readonly accessors
    public get round_number(): number { return this._round_number; }
    public get round_phase(): RoundPhases { return this._round_phase; }
    public get players(): Player[] { return this._players; }
    public get cup_line_parameters() { return this._cup_line_parameters; }
    public get decision_phase_duration(): number { return this._decision_phase_duration; }
    
    constructor(randomize: boolean = false, use_custom_state: boolean = false) {
        if (use_custom_state) {
            try {
                this.loadCustomState(CustomState as CustomStateType);
            } catch (error) {
                console.warn("Failed to load custom state, using defaults:", error);
            }
        } else if (randomize) {
            this._round_number = Math.floor(Math.random() * 1000000);
            this._round_phase = Math.floor(Math.random() * Object.keys(RoundPhases).length / 2);
            
            // Generate a random number of players, ranging from 1 to 4
            this._players = [];
            for (let i = 0; i < Math.floor(Math.random() * 4) + 1; i++) {
                this._players.push(new Player(`Player ${i + 1}`, new Color3(Math.random(), Math.random(), Math.random())));
            }
        }
    }


    private loadCustomState(state: CustomStateType): void {
        if (state.cup_line_parameters) {
            this._cup_line_parameters = state.cup_line_parameters;
        }
        if (state.decision_phase_duration !== undefined) {
            this._decision_phase_duration = state.decision_phase_duration;
        }
        if (state.round_number !== undefined) {
            this._round_number = state.round_number;
        }
        if (state.players) {
            this._players = state.players.map(playerData => new Player(
                playerData.name,
                new Color3(playerData.color.r, playerData.color.g, playerData.color.b),
                playerData.isEliminated,
                playerData.selectedCup,
                playerData.stats
            ));
        }
    }

    public guessesLockedIn(correct_cup_index: number): void {
        // Update player stats based on their guesses
        for (const player of this._players) {
            if (!player.isEliminated) {
                player.stats.total_guesses++;
                if (player.selectedCup === correct_cup_index) {
                    player.stats.correct_guesses++;
                    player.stats.wins++;
                } else {
                    player.stats.losses++;
                    player.isEliminated = true;
                }
            }
        }
    }

    public startRandomChoiceUpdates(): void {
        // Clear any existing interval
        if (this._choice_update_interval) {
            clearInterval(this._choice_update_interval);
        }

        // Update choices every 2 seconds
        this._choice_update_interval = setInterval(() => {
            this.updateRandomPlayerChoices();
        }, 2000);
    }

    public stopRandomChoiceUpdates(): void {
        if (this._choice_update_interval) {
            clearInterval(this._choice_update_interval);
            this._choice_update_interval = null;
        }
    }

    private updateRandomPlayerChoices(): void {
        // Only update choices during the guessing phase
        if (this._round_phase !== RoundPhases.GuessingPhase) {
            return;
        }

        for (const player of this._players) {
            if (!player.isEliminated && Math.random() < 0.5) { // 50% chance to change choice
                // Randomly select a new cup
                const newChoice = Math.floor(Math.random() * this._cup_line_parameters.numberOfCups);
                player.selectedCup = newChoice;
            }
        }
    }

    // Modify phaseCompleted to handle the choice updates
    public async phaseCompleted(phase: RoundPhases): Promise<void> {
        this._round_phase = this._round_phase + 1;
        
        // Start random choice updates when entering guessing phase
        if (this._round_phase === RoundPhases.GuessingPhase) {
            this.startRandomChoiceUpdates();
        } else {
            this.stopRandomChoiceUpdates();
        }

        if (this._round_phase > RoundPhases.Reset) {
            this._round_phase = RoundPhases.DisplayCoupon;
            this._round_number = this._round_number + 1;
        }
    }

    // Make sure to clean up when the game ends
    public dispose(): void {
        this.stopRandomChoiceUpdates();
    }
}