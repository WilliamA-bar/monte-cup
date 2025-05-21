import { SupabaseClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

import { BaseGameState, BasePlayerState } from "./schema";
import { SupabaseAdapter } from "./supabase-adapter";

export interface RoomOptions<
  T extends BaseGameState<P>,
  P extends BasePlayerState,
> {
  roomId: string;
  initialState: T;
}

/**
 * The "server-side" Session Class that is to be extended for use by a Game implementation
 * Uses a Supabase adapter in order to mock Colyseus API with alternative Supabase networking
 */
export class ServerRoom<T extends BaseGameState<P>, P extends BasePlayerState> {
  public state: T;
  private adapter: SupabaseAdapter<T, P>;
  public roomId: string;
  private waitingRoomInterval: NodeJS.Timeout | null = null;
  private gameTimeoutInterval: NodeJS.Timeout | null = null;
  public code: string;

  constructor(
    engagementId: string,
    supabaseClient: SupabaseClient,
    initialState?: Partial<T>,
  ) {
    this.roomId = uuidv4();
    this.code = this.roomId.slice(0, 4);
    this.adapter = new SupabaseAdapter<T, P>(this.roomId, supabaseClient);

    const defaultState: Omit<
      BaseGameState<BasePlayerState>,
      "game_starts_by" | "game_ends_by"
    > = {
      engagement_name: "Default Engagement",
      game_type: "ranked",
      phase: "waiting",
      players: {},
      rewards: [],
      created_at: new Date().toISOString(),
    };

    let gameEndsBy: string | null = null;
    const gameStartsBy = new Date(
      Date.now() + (initialState?.waiting_room_interval || 0),
    ).toISOString();
    if (initialState?.timeout_interval) {
      gameEndsBy = new Date(
        new Date(gameStartsBy).getTime() +
          (initialState?.timeout_interval || 0),
      ).toISOString();
    } else {
      gameEndsBy = null;
    }

    this.state = {
      ...defaultState,
      ...initialState,
      game_starts_by: gameStartsBy,
      game_ends_by: gameEndsBy,
      code: this.code,
    } as unknown as T;

    // Subscribe to state changes
    this.adapter.subscribe((newState) => {
      console.log("new room state", newState);
      this.state = newState;

      // Safety methods for this shared server approach that should be used to kill room specific game-clock intervals when other client driven conditions accelerate their progress
      if (this.state.game_started_at) {
        if (this.waitingRoomInterval) {
          clearInterval(this.waitingRoomInterval);
        }
      }
      if (this.state.game_ended_at) {
        if (this.gameTimeoutInterval) {
          clearInterval(this.gameTimeoutInterval);
        }
      }
    });

    this.adapter
      .initializeRoom(engagementId, this.state)
      .then(({ roomId, state }) => {
        console.log("Adapter initialized with state", this.state);
        this.roomId = roomId;
        this.state = state;
      });

    if (this.state.waiting_room_interval) {
      this.openWaitingRoom();
    } else {
      this.startGame();
    }
  }

  private openWaitingRoom(): void {
    const gameStartsIn =
      new Date(this.state.game_starts_by).getTime() - Date.now();
    console.log("Opening waiting room", gameStartsIn);
    this.waitingRoomInterval = setInterval(() => {
      this.startGame();
    }, gameStartsIn);
  }

  private startGame(): void {
    if (this.waitingRoomInterval) {
      clearInterval(this.waitingRoomInterval);
    }
    if (
      this.state.min_players &&
      Object.keys(this.state.players).length < this.state.min_players
    ) {
      console.log("Not enough players, ending game");
      this.adapter.updateState({
        ...this.state,
        not_enough_players: true,
        game_ended_at: new Date().toISOString(),
        phase: "ended",
      });
      return;
    }

    this.adapter.updateState({
      ...this.state,
      game_started_at: new Date().toISOString(),
      phase: "active",
    });
    if (this.state.game_ends_by) {
      const gameEndsIn =
        new Date(this.state.game_ends_by).getTime() - Date.now();
      console.log("Starting game", gameEndsIn);

      this.gameTimeoutInterval = setInterval(async () => {
        this.endGame(true);
      }, gameEndsIn);
    } else {
      console.log("No game end time, staying alive");
    }
  }

  private endGame(timedOut: boolean): void {
    if (this.gameTimeoutInterval) {
      clearInterval(this.gameTimeoutInterval);
    }
    console.log("Ending game");
    this.adapter.updateState({
      ...this.state,
      game_ended_at: new Date().toISOString(),
      was_stalemate: timedOut,
      phase: "ended",
    });
  }

  /**
   * Returns the adapter instance used by this ServerRoom
   * This allows the HostRoom to reuse the same adapter instead of creating a new one
   */
  public getAdapter(): SupabaseAdapter<T, P> {
    return this.adapter;
  }
}
