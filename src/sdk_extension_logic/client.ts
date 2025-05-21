import { SupabaseClient } from "@supabase/supabase-js";

import {
  BaseClient,
  BaseClientRoom,
  BaseHostRoom,
  SupabaseAdapter,
  User,
} from "../sdk/";

import type {
  GameState,
  MessagePayloads,
  MessageType,
  PlayerState,
} from "./schema";
import { GameLogic } from "./logic";
import { baseInitialState } from "./schema";
import { ServerRoom } from "./server";

// Class extension definition
export class Client extends BaseClient<
  GameState<PlayerState>,
  PlayerState,
  MessageType,
  MessagePayloads
> {
  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    supabaseClient?: SupabaseClient,
  ) {
    super(supabaseUrl, supabaseKey, supabaseClient);
  }

  protected createGameLogic(
    state: GameState<PlayerState>,
    adapter: SupabaseAdapter<GameState<PlayerState>, PlayerState>,
  ): GameLogic {
    return new GameLogic(state, adapter);
  }

  join(
    roomId: string,
    user: User,
  ): BaseClientRoom<
    GameState<PlayerState>,
    PlayerState,
    MessageType,
    MessagePayloads
  > {
    return new BaseClientRoom<
      GameState<PlayerState>,
      PlayerState,
      MessageType,
      MessagePayloads
    >(
      roomId,
      user,
      this.supabaseClient,
      baseInitialState,
      {
        isEliminated: false,
        eliminatedAtRound: null,
        color: "#" + Math.floor(Math.random()*16777215).toString(16), // Random color
        name: user.username || "Player",
        selectedCup: 0
      },
      (state, adapter) => this.createGameLogic(state, adapter),
    );
  }

  create(
    engagementId: string,
    initialState?: Partial<GameState<PlayerState>>,
  ): BaseHostRoom<
    GameState<PlayerState>,
    PlayerState,
    MessageType,
    MessagePayloads
  > {
    return new BaseHostRoom(
      engagementId,
      this.supabaseClient,
      { ...baseInitialState, ...initialState },
      (state, adapter) => this.createGameLogic(state, adapter),
      new ServerRoom(engagementId, this.supabaseClient, {
        ...baseInitialState,
        ...initialState,
      }),
    );
  }
}

export type ClientRoom = BaseClientRoom<
  GameState<PlayerState>,
  PlayerState,
  MessageType,
  MessagePayloads
>;

export type HostRoom = BaseHostRoom<
  GameState<PlayerState>,
  PlayerState,
  MessageType,
  MessagePayloads
>;
