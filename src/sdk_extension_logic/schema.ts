import {
  BaseGameState,
  BaseMessagePayloads,
  BaseMessageType,
  BasePlayerState,
} from "../sdk";

export interface PlayerState extends BasePlayerState {
  isEliminated: boolean;
  eliminatedAtRound: number | null;
  color: string;
  name: string;
  selectedCup: number;
}

export interface GameState<P extends PlayerState> extends BaseGameState<P> {
  phases: {
    displayCoupon: boolean;
    shuffleCups: boolean;
    guessingPhase: boolean;
    revealCoupon: boolean;
    endRound: boolean;
  }
  round: number;
  number_of_cups: number;  // Number of cups in the game
  //activeCatch: string | null; // ID of player currently catching
  players: Record<string, P>;
  starting_cup: number;      // Index of the cup that has the prize 
  shuffle_sequence: number[][];  // Store the sequence of cup movements
  last_shuffle_time?: number;  // Track when the last shuffle occurred
  world_entities: Record<string, HemletModel>;
  current_shuffle_parameters: {
    number_of_cups: number;
    shuffle_duration: number;
    shuffle_pace_base: number;
    shuffle_pace_variance: number;
  }
}


export class BaseWorldModel {
  private position: { x: number, y: number, z: number };
  private id: string;
  private rotation: { x: number, y: number, z: number };
  private visible: boolean;

  constructor(position: { x: number, y: number, z: number }, id: string, rotation: { x: number, y: number, z: number }, visible: boolean) {
    this.position = position;
    this.id = id;
    this.rotation = rotation;
    this.visible = visible;
  }

  public getPosition(): { x: number, y: number, z: number } {
    return this.position;
  }

  public getRotation(): { x: number, y: number, z: number } {
    return this.rotation;
  }
  
  public getVisible(): boolean {
    return this.visible;
  }

  public setVisible(visible: boolean): void {
    this.visible = visible;
  }

  public setPosition(position: { x: number, y: number, z: number }): void {
    this.position = position;
  }

  public setRotation(rotation: { x: number, y: number, z: number }): void {
    this.rotation = rotation;
  }

  public getId(): string {
    return this.id;
  }

}


export class HemletModel extends BaseWorldModel {

  private mesh_path: string;
  private displaying_coupon: boolean;

  constructor(position: { x: number, y: number, z: number }, id: string, rotation: { x: number, y: number, z: number }, visible: boolean) {
    super(position, id, rotation, visible);
    this.mesh_path = "models/hemlet.glb";
    this.displaying_coupon = false;
  }

  public getMeshPath(): string {
    return this.mesh_path;
  }

  public getDisplayingCoupon(): boolean {
    return this.displaying_coupon;
  }

  public setDisplayingCoupon(displaying_coupon: boolean): void {
    this.displaying_coupon = displaying_coupon;
  }

}

export type MessageType = BaseMessageType | "VOTE" | "PHASE_COMPLETE" | "SIMULATION_OUTCOME";

export interface MessagePayloads extends BaseMessagePayloads {
  VOTE: number;
  PHASE_COMPLETE: undefined;
}

// Game Constants
export const GAME_CONSTANTS = {
  PHASES: {
    SETUP: "setup",
    DISPLAY_COUPON: "displayCoupon",
    SHUFFLE_CUPS: "shuffleCups",
    GUESSING_PHASE: "guessingPhase",
    REVEAL_COUPON: "revealCoupon",
    END_ROUND: "endRound",
    GAME_OVER: "gameOver"
  },
  ROUND_ONE_SHUFFLE_PARAMETERS: {
    NUMBER_OF_CUPS: 3,
    SHUFFLE_DURATION: 10, // seconds
    SHUFFLE_PACE_BASE: 0.44, // seconds
    SHUFFLE_PACE_VARIANCE: 0.25, // seconds
  },
  RAMP_UP_AFTER_THIS_MANY_ROUNDS: 2,
  RAMP_UP_PARAMETER_INCREASES: {
    INCREASE_IN_CUPS: 1,
    SHUFFLE_DURATION: 10, // seconds
    SHUFFLE_PACE_BASE: 0.05, // seconds
    SHUFFLE_PACE_VARIANCE: 0.06, // seconds
  },
  MAXIMUM_RAMP_UPS: 6,
  GUESSING_PHASE_DURATION: 5, // seconds
} as const;

export const baseInitialState: GameState<PlayerState> = {
  round: 1,                 // Start at round 1
  number_of_cups: GAME_CONSTANTS.ROUND_ONE_SHUFFLE_PARAMETERS.NUMBER_OF_CUPS,
  players: {
    "test-player-1": {     // Add a test player
      user_id: "test-player-1",
      isEliminated: false,
      eliminatedAtRound: null,
      color: "#FF0000",    // Red color for testing
      name: "Test Player",
      selectedCup: 0
    },
    "test-player-2": {     // Add a test player
      user_id: "test-player-2",
      isEliminated: false,
      eliminatedAtRound: null,
      color: "#0000FF",    // Blue color for testing
      name: "William",
      selectedCup: 1
    },
    "test-player-3": {     // Add a test player
      user_id: "test-player-3",
      isEliminated: false,
      eliminatedAtRound: null,
      color: "#00FF00",    // Green color for testing
      name: "John",
      selectedCup: 2
    }
  },
  game_phase: GAME_CONSTANTS.PHASES.SETUP,
  phase: "waiting",         // Required from BaseGameState
  game_type: "ranked",      // Required from BaseGameState
  engagement_name: "Three Cup Monte",  // Required from BaseGameState
  rewards: [],             // Required from BaseGameState
  created_at: new Date().toISOString(),  // Required from BaseGameState
  starting_cup: 0,      // Start with prize under first cup
  correct_cup_index: 0,      // Start with prize under first cup
  shuffle_sequence: [],     // Empty shuffle sequence to start
  last_shuffle_time: undefined,  // No shuffles yet
  current_shuffle_parameters: {
    number_of_cups: GAME_CONSTANTS.ROUND_ONE_SHUFFLE_PARAMETERS.NUMBER_OF_CUPS,
    shuffle_duration: GAME_CONSTANTS.ROUND_ONE_SHUFFLE_PARAMETERS.SHUFFLE_DURATION,
    shuffle_pace_base: GAME_CONSTANTS.ROUND_ONE_SHUFFLE_PARAMETERS.SHUFFLE_PACE_BASE,
    shuffle_pace_variance: GAME_CONSTANTS.ROUND_ONE_SHUFFLE_PARAMETERS.SHUFFLE_PACE_VARIANCE,
  }
} as unknown as GameState<PlayerState>;
