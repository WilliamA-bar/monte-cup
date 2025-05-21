import { SupabaseClient } from "@supabase/supabase-js";

import { BaseServerRoom } from "../sdk";

import { GameLogic } from "./logic";
import { GameState, PlayerState } from "./schema";

export class ServerRoom extends BaseServerRoom<
  GameState<PlayerState>,
  PlayerState
> {
  private gameLogic: GameLogic;

  constructor(
    engagementId: string,
    supabaseClient: SupabaseClient,
    initialState?: Partial<GameState<PlayerState>>,
  ) {
    const defaultInitialState = {
      activeCatch: null,
      ...initialState,
    };

    console.log(
      "[ServerRoom] Initializing for engagement",
      engagementId,
      "with state:",
      defaultInitialState,
    );
    super(engagementId, supabaseClient, defaultInitialState);
    this.gameLogic = new GameLogic(this.state, this.getAdapter());
    console.log("[ServerRoom] Initialized successfully");
  }

  public cleanup(): void {
    console.log("[ServerRoom] Cleaning up");
    this.gameLogic.cleanup();
    console.log("[ServerRoom] Cleanup complete");
  }
}
