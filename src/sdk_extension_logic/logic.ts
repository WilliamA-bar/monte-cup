import { BaseGameLogic, SupabaseAdapter } from "../sdk";

import {
  GAME_CONSTANTS,
  GameState,
  MessagePayloads,
  MessageType,
  PlayerState,
  HemletModel,
} from "./schema";

/**
 * Game logic class for the fishing game
 */
export class GameLogic extends BaseGameLogic<
  GameState<PlayerState>,
  PlayerState,
  MessageType,
  MessagePayloads
> {

  private clientTimers: Map<string, NodeJS.Timeout> = new Map();
  private choiceUpdateInterval: NodeJS.Timeout | null = null;
  private isGameLoopRunning: boolean = false;

  constructor(
    state: GameState<PlayerState>,
    adapter: SupabaseAdapter<GameState<PlayerState>, PlayerState>,
  ) {
    super(state, adapter);

    console.log("[GameLogic] Initialized with state:", state);
  }

  public startGame(): void {
    if (!this.isGameLoopRunning) {
      this.isGameLoopRunning = true;
      this.state.world_entities = {
        hemlet: new HemletModel(
          { x: 0, y: 0, z: 0 },
          "hemlet",
          { x: 0, y: 0, z: 0 },
          true
        ),
      };
      this.gameLoop();
    }
  }

  private async gameLoop(): Promise<void> {
    console.log("[GameLogic] Starting game loop");
    // Wait a couple seconds before starting so loading screen is visible
    this.state.game_display_message = "Loading..."
    await this.adapter.updateState(this.state);
    await new Promise(resolve => setTimeout(resolve, 2500));

    // So long as num players not eliminated > 1, continue the game loop
    // Original condition: while (Object.values(this.state.players).filter(player => !player.isEliminated).length > 1 && this.isGameLoopRunning)
    while (this.state.round <= 5 && this.isGameLoopRunning) {
      console.log("[GameLogic] Game loop iteration");
      
      // Set phase to setup and generate starting cup
      this.state.game_phase = GAME_CONSTANTS.PHASES.SETUP;
      this.state.starting_cup = this.generateStartingCup();
      this.state.correct_cup_index = this.state.starting_cup; // Keep both in sync during transition
      this.state.game_display_message = GAME_CONSTANTS.GAME_DISPLAY_MESSAGES.SETUP;
      await this.adapter.updateState(this.state);
      console.log("[GameLogic] Starting cup:", this.state.starting_cup);

      // Display coupon phase
      this.state.game_phase = GAME_CONSTANTS.PHASES.DISPLAY_COUPON;
      this.state.game_display_message = GAME_CONSTANTS.GAME_DISPLAY_MESSAGES.DISPLAY_COUPON;
      await this.adapter.updateState(this.state);
      console.log("[GameLogic] Displaying coupon");
      await new Promise(resolve => setTimeout(resolve, 4000));

      // Shuffle phase
      this.state.game_phase = GAME_CONSTANTS.PHASES.SHUFFLE_CUPS;
      [this.state.shuffle_sequence, this.state.starting_cup] = this.createShuffleSequence();
      this.state.correct_cup_index = this.state.starting_cup; // Keep both in sync during transition
      this.state.game_display_message = GAME_CONSTANTS.GAME_DISPLAY_MESSAGES.SHUFFLE_CUPS;
      await this.adapter.updateState(this.state);
      console.log("[GameLogic] Shuffling cups");
      const shuffle_duration = this.state.current_shuffle_parameters.shuffle_duration;
      await new Promise(resolve => setTimeout(resolve, shuffle_duration * 1000));

      // Guessing phase
      this.state.game_phase = GAME_CONSTANTS.PHASES.GUESSING_PHASE;
      this.state.game_display_message = GAME_CONSTANTS.GAME_DISPLAY_MESSAGES.GUESSING_PHASE;
      await this.adapter.updateState(this.state);
      this.state.guessing_phase_timer = 5;

      for (let i = 0; i < GAME_CONSTANTS.GUESSING_PHASE_DURATION; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        this.state.guessing_phase_timer--;
        await this.adapter.updateState(this.state);
      }

      // Reveal phase
      this.state.game_phase = GAME_CONSTANTS.PHASES.REVEAL_COUPON;
      this.state.game_display_message = GAME_CONSTANTS.GAME_DISPLAY_MESSAGES.REVEAL_COUPON;
      // Check player inputs against the correct cup
      this.validateGuesses(this.state.starting_cup);
      await this.adapter.updateState(this.state);
      await new Promise(resolve => setTimeout(resolve, 4000));

      // End round phase
      this.state.game_phase = GAME_CONSTANTS.PHASES.END_ROUND;
      this.state.game_display_message = GAME_CONSTANTS.GAME_DISPLAY_MESSAGES.END_ROUND;

      this.state.round++;

      // // Update game parameters
      // if (this.state.round === 3) {
      //   this.state.number_of_cups = 4;
      // }
      // else if (this.state.round === 5) {
      //   this.state.number_of_cups = 5;
      // }
      this.state.current_shuffle_parameters.shuffle_pace_base = Math.max(0.01, this.state.current_shuffle_parameters.shuffle_pace_base - GAME_CONSTANTS.RAMP_UP_PARAMETER_INCREASES.SHUFFLE_PACE_BASE);
      this.state.current_shuffle_parameters.shuffle_pace_variance = Math.max(0.01, this.state.current_shuffle_parameters.shuffle_pace_variance - GAME_CONSTANTS.RAMP_UP_PARAMETER_INCREASES.SHUFFLE_PACE_VARIANCE);
      
      
      await this.adapter.updateState(this.state);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Game over
    this.state.round = 5; // Hardcoded so that the game doesn't display "Round 6"
    this.state.game_phase = GAME_CONSTANTS.PHASES.GAME_OVER;
    this.state.game_display_message = GAME_CONSTANTS.GAME_DISPLAY_MESSAGES.GAME_OVER;
    await this.adapter.updateState(this.state);
    this.isGameLoopRunning = false;
    console.log("[GameLogic] Game loop ended");
  }

  private generateStartingCup(): number {
    const num_cups = this.state.number_of_cups;
    // Pick a random cup from 0 to num_cups - 1
    const starting_cup = Math.floor(Math.random() * num_cups);
    return starting_cup;
  }

  private createShuffleSequence(): [number[][], new_correct_cup_index: number] {
    // TODO: Implement this
    // Create pairs of cup indices to shuffle, and then pass it to game state to have it visually represented
    // Have the sequence, and the correct cup index, stored in the state
    const time_for_shuffling = this.state.current_shuffle_parameters.shuffle_duration - 1; // seconds
    const time_per_shuffle = this.state.current_shuffle_parameters.shuffle_pace_base + this.state.current_shuffle_parameters.shuffle_pace_variance;
    //console.log("[GameLogic] Time per shuffle:", time_per_shuffle);
    //console.log("[GameLogic] Time for shuffling:", time_for_shuffling);
    const num_shuffles = Math.floor(time_for_shuffling / time_per_shuffle);

    //console.log("[GameLogic] Number of shuffles:", num_shuffles);

    const lower_bound = 0;
    const upper_bound = this.state.number_of_cups - 1;
    const sequence: number[][] = [];
    for (let i = 0; i < num_shuffles; i++) {
      const first_index = Math.floor(Math.random() * (upper_bound - lower_bound + 1)) + lower_bound;
      let second_index = Math.floor(Math.random() * (upper_bound - lower_bound + 1)) + lower_bound;

      while (first_index === second_index) {
        second_index = Math.floor(Math.random() * (upper_bound - lower_bound + 1)) + lower_bound;
      }
      sequence.push([first_index, second_index]);
    }

    // update the starting cup index by iterating through sequence
    for (const pair of sequence) {
      if (pair[0] === this.state.starting_cup) {
        this.state.starting_cup = pair[1];
      } else if (pair[1] === this.state.starting_cup) {
        this.state.starting_cup = pair[0];
      }
    }
    console.log("[GameLogic] New starting cup:", this.state.starting_cup);

    return [sequence, this.state.starting_cup];
  }

    public override handleMessage(
    message: MessageType,
    payload: MessagePayloads[MessageType],
    sender?: PlayerState | null,
  ): void {
    if (!sender?.user_id) {
      console.log(
        "[GameLogic] Received message without valid sender ID:",
        message,
      );
      return;
    }

    console.log(
      "[GameLogic] Handling message",
      message,
      "from player",
      sender.user_id,
    );

    switch (message) {
      case "VOTE":
        this.handleGuess(sender.user_id, payload);
        break;
    }
  }

  private handleGuess(playerId: string, payload: MessagePayloads[MessageType]): void {
    const player = this.state.players[playerId];
    const vote = payload;

    if (this.state.game_phase === GAME_CONSTANTS.PHASES.GUESSING_PHASE && player.isEliminated === false) {
      player.selectedCup = vote;
    }

    console.log("[GameLogic] Player", playerId, "voted", vote);
  }

  private validateGuesses(correctCupIndex: number): void {
    const players = Object.values(this.state.players);
    for (const player of players) {
      console.log("[GameLogic] Player", player.user_id, "selected cup", player.selectedCup, "correct cup", correctCupIndex);
      if (!player.isEliminated) {
        if (player.selectedCup !== correctCupIndex) {
          console.log("[GameLogic] Player", player.user_id, "selected cup", player.selectedCup, "is not the correct cup");
          player.isEliminated = true;
          player.eliminatedAtRound = this.state.round;
        }
      }
    }
    this.adapter.updateState(this.state);
  }


    public cleanup(): void {
    this.isGameLoopRunning = false;
    if (this.choiceUpdateInterval) {
      clearInterval(this.choiceUpdateInterval);
      this.choiceUpdateInterval = null;
    }
    for (const timer of this.clientTimers.values()) {
      clearTimeout(timer);
    }
    this.clientTimers.clear();
    super.cleanup();
  }
}
