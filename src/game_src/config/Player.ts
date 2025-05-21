import { Color3 } from '@babylonjs/core';

export interface PlayerStats {
    correct_guesses: number;
    total_guesses: number;
    wins: number;
    losses: number;
}

export class Player {
    public stats: PlayerStats;

    constructor(
        public name: string,
        public color: Color3,
        public isEliminated: boolean = false,
        public selectedCup: number = 0,
        stats?: PlayerStats
    ) {
        this.stats = stats ?? {
            correct_guesses: 0,
            total_guesses: 0,
            wins: 0,
            losses: 0
        };
    }
}

// Default player state
export const DEFAULT_PLAYER: Player = {
    name: "Player 1",
    color: new Color3(1, 1, 1),
    isEliminated: false,
    selectedCup: 0,
    stats: {
        correct_guesses: 0,
        total_guesses: 0,
        wins: 0,
        losses: 0
    }
};

// Function to create a new player with a specific name
export function createPlayer(name: string): Player {
    return new Player(name, new Color3(1, 1, 1));
}