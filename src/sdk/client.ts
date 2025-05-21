import { createClient, SupabaseClient } from "@supabase/supabase-js";

import { GameLogic } from "./logic";
import {
  BaseGameState,
  baseInitialState,
  BaseMessagePayloads,
  BaseMessageType,
  BasePlayerState,
  User,
} from "./schema";
import { ServerRoom } from "./server";
import { SupabaseAdapter } from "./supabase-adapter";

interface IClient<
  T extends BaseGameState<P>,
  P extends BasePlayerState,
  M extends BaseMessageType,
  MP extends BaseMessagePayloads[M],
> {
  join(roomId: string, user: User): ClientRoom<T, P, M, MP>;
  create(
    engagementId: string,
    initialState?: Partial<T>,
  ): HostRoom<T, P, M, MP>;
}

/**
 * The "client" export as a front-end API to use for local game state implementation and networking.
 * Figuring out how to navigate the Host vs Player paradigm will be difficult.
 */
export class BaseClient<
  T extends BaseGameState<P>,
  P extends BasePlayerState,
  M extends BaseMessageType,
  MP extends BaseMessagePayloads[M],
> implements IClient<T, P, M, MP>
{
  protected supabaseClient: SupabaseClient;

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    supabaseClient?: SupabaseClient,
  ) {
    if (supabaseClient) {
      this.supabaseClient = supabaseClient;
    } else {
      this.supabaseClient = createClient(supabaseUrl, supabaseKey);
    }
  }

  /**
   * Protected factory method to create GameLogic instances
   * Games can extend this class and override this method to provide custom GameLogic
   */
  protected createGameLogic(
    state: T,
    adapter: SupabaseAdapter<T, P>,
  ): GameLogic<T, P, M, MP> {
    return new GameLogic<T, P, M, MP>(state, adapter);
  }

  join(roomId: string, user: User): ClientRoom<T, P, M, MP> {
    return new ClientRoom<T, P, M, MP>(
      roomId,
      user,
      this.supabaseClient,
      baseInitialState as T,
      {} as P,
      (state: T, adapter: SupabaseAdapter<T, P>) =>
        this.createGameLogic(state, adapter),
    );
  }

  create(
    engagementId: string,
    initialState?: Partial<T>,
  ): HostRoom<T, P, M, MP> {
    const state = { ...baseInitialState, ...initialState } as T;
    return new HostRoom<T, P, M, MP>(
      engagementId,
      this.supabaseClient,
      state,
      (state: T, adapter: SupabaseAdapter<T, P>) =>
        this.createGameLogic(state, adapter),
      undefined,
    );
  }
}

/**
 * Base Room interface that both ClientRoom and HostRoom implement
 * to provide a consistent API for both host and client applications
 */
export interface IRoom<
  T extends BaseGameState<P>,
  P extends BasePlayerState,
  M extends BaseMessageType,
  MP extends BaseMessagePayloads[M],
> {
  roomId: string;
  state: T;
  onStateChange(callback: (newState: T) => void): void;
  onPlayerAdd(callback: (player: P) => void): void;
  onPlayerRemove(callback: (player: P) => void): void;
  stateListen<K extends keyof T>(
    path: K,
    callback: (value: T[K]) => void,
  ): void;
  send(message: M, data: MP[M]): void;
  cleanup(): void;
}

/**
 * Abstract base class that implements common functionality for both ClientRoom and HostRoom
 */
export abstract class BaseRoom<
  T extends BaseGameState<P>,
  P extends BasePlayerState,
  M extends BaseMessageType,
  MP extends BaseMessagePayloads[M],
> implements IRoom<T, P, M, MP>
{
  protected adapter: SupabaseAdapter<T, P>;
  public roomId: string;
  public state: T;

  protected listenerIds: string[] = [];
  protected gameLogic: GameLogic<T, P, M, MP>;

  constructor(
    roomId: string,
    supabaseClient: SupabaseClient,
    initialState: T,
    injectedAdapter?: SupabaseAdapter<T, P>,
    gameLogicFactory?: (
      state: T,
      adapter: SupabaseAdapter<T, P>,
    ) => GameLogic<T, P, M, MP>,
  ) {
    this.roomId = roomId;
    this.adapter =
      injectedAdapter || new SupabaseAdapter<T, P>(roomId, supabaseClient);

    this.state = initialState;
    this.gameLogic = gameLogicFactory
      ? gameLogicFactory(this.state, this.adapter)
      : new GameLogic<T, P, M, MP>(this.state, this.adapter);

    this.listenerIds.push(
      this.adapter.subscribe((newState) => {
        this.state = newState;
        this.gameLogic.setState(newState);
      }),
    );
  }

  onStateChange(callback: (newState: T) => void) {
    this.listenerIds.push(this.adapter.subscribe(callback));
  }

  onPlayerAdd(callback: (player: P) => void) {
    this.listenerIds.push(
      this.adapter.subscribe((newState) => {
        if (
          Object.keys(newState.players).length >
          Object.keys(this.state.players).length
        ) {
          const player = Object.values(newState.players).find(
            (player) => !this.state.players[player.session_id],
          );
          if (player) {
            callback(player);
          }
        }
      }),
    );
  }

  onPlayerRemove(callback: (player: P) => void) {
    this.listenerIds.push(
      this.adapter.subscribe((newState) => {
        if (
          Object.keys(newState.players).length <
          Object.keys(this.state.players).length
        ) {
          const player = Object.values(this.state.players).find(
            (player) => !newState.players[player.session_id],
          );
          if (player) {
            callback(player);
          }
        }
      }),
    );
  }

  stateListen<K extends keyof T>(path: K, callback: (value: T[K]) => void) {
    this.listenerIds.push(
      this.adapter.subscribe((newState) => {
        const value = newState[path];
        callback(value);
      }),
    );
  }

  send(message: M, data?: MP[M]): void {
    this.gameLogic.handleMessage(message, data);
  }

  cleanup() {
    this.listenerIds.forEach((id) => this.adapter.unsubscribe(id));
    this.gameLogic.cleanup();
  }
}

/**
 * The "client-side" Session Class that is to be extended for use by a Game implementation
 * Uses a Supabase adapter in order to mock Colyseus API with alternative Supabase networking
 * Should provide the Game Logic Implementation in engagements with the ability to directly call game logic with direct writes to supabase
 */
export class ClientRoom<
  T extends BaseGameState<P>,
  P extends BasePlayerState,
  M extends BaseMessageType,
  MP extends BaseMessagePayloads[M],
> extends BaseRoom<T, P, M, MP> {
  public sessionId: string;
  public player: P;

  constructor(
    roomId: string,
    user: User,
    supabaseClient: SupabaseClient,
    initialState: T,
    initialPlayerState?: Partial<P>,
    gameLogicFactory?: (
      state: T,
      adapter: SupabaseAdapter<T, P>,
    ) => GameLogic<T, P, M, MP>,
  ) {
    super(roomId, supabaseClient, initialState, undefined, gameLogicFactory);
    this.player = this.gameLogic.onRegisterPlayer(
      user.id,
      user.username,
      user.avatar_url,
      initialPlayerState,
    );
    this.sessionId = user.id;
  }

  leave() {
    this.adapter.removePlayer(this.sessionId);
  }

  send(message: M, data: MP[M]): void {
    this.gameLogic.handleMessage(message, data, this.player);
  }

  cleanup() {
    this.leave();
    super.cleanup();
  }
}

/**
 * The "host-side" Session Class that wraps the ServerRoom
 * Implements the same interface as ClientRoom for consistency
 * but uses ServerRoom for state management instead of directly using SupabaseAdapter
 */
export class HostRoom<
  T extends BaseGameState<P>,
  P extends BasePlayerState,
  M extends BaseMessageType,
  MP extends BaseMessagePayloads[M],
> extends BaseRoom<T, P, M, MP> {
  private serverRoom: ServerRoom<T, P>;

  constructor(
    engagementId: string,
    supabaseClient: SupabaseClient,
    initialState: T,
    gameLogicFactory?: (
      state: T,
      adapter: SupabaseAdapter<T, P>,
    ) => GameLogic<T, P, M, MP>,
    injectedServerRoom?: ServerRoom<T, P>,
  ) {
    // Initialize the ServerRoom to handle game logic and state management
    const serverRoom =
      injectedServerRoom ||
      new ServerRoom<T, P>(engagementId, supabaseClient, initialState);

    // Pass the ServerRoom's adapter to avoid creating a duplicate adapter
    super(
      serverRoom.roomId,
      supabaseClient,
      initialState,
      serverRoom.getAdapter(),
      gameLogicFactory,
    );
    this.serverRoom = serverRoom;
  }
  
  // Get the server room code for display purposes
  public getServerRoomCode(): string {
    return this.serverRoom.code;
  }
}
