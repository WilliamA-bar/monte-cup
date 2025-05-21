import { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

import { BaseGameState, BasePlayerState } from "./schema";

interface IAdapter<T extends BaseGameState<P>, P extends BasePlayerState> {
  initializeRoom(
    engagementId: string,
    initialState: T,
  ): Promise<{ roomId: string; state: T }>;
  getState(): Promise<{ state: T; error: any }>;
  updateState(state: T): Promise<void>;
  subscribe(callback: (state: T) => void): string;
  unsubscribe(listenerId: string): void;
  addPlayer(sessionId: string, player: any): Promise<void>;
  removePlayer(roomId: string, sessionId: string): Promise<void>;
}

export class SupabaseAdapter<
  T extends BaseGameState<P>,
  P extends BasePlayerState,
> implements IAdapter<T, P>
{
  private supabase: SupabaseClient;
  private channel: RealtimeChannel | null = null;
  private listeners: Map<string, (state: T) => void> = new Map();
  public roomId: string;

  constructor(roomId: string, supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
    this.roomId = roomId;
  }

  async initializeRoom(
    engagementId: string,
    initialState: T,
  ): Promise<{ roomId: string; state: T }> {
    const { data: newData, error: insertError } = await this.supabase
      .from("engagement_session")
      .insert({
        id: this.roomId,
        code: this.roomId.slice(0, 4),
        state: initialState,
        engagement_id: engagementId,
      })
      .select()
      .single();
    if (insertError) throw insertError;
    return { roomId: newData.id, state: newData.state };
  }

  async getState(): Promise<{ state: T; error: any }> {
    const { data, error } = await this.supabase
      .from("engagement_session")
      .select("*")
      .eq("id", this.roomId)
      .single();
    return { state: data.state as T, error };
  }

  async updateState(state: T): Promise<void> {
    const { error } = await this.supabase
      .from("engagement_session")
      .update({
        state,
      })
      .eq("id", this.roomId);
    if (error) throw error;
  }

  subscribe(callback: (state: T) => void): string {
    const listenerId = uuidv4();
    this.listeners.set(listenerId, callback);

    const handleChanges = (payload: any) => {
      const newState = payload.new.state as T;
      this.listeners.forEach((cb) => cb(newState));
    };

    if (!this.channel) {
      this.channel = this.supabase
        .channel(`engagement_session:${this.roomId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "engagement_session",
            filter: `id=eq.${this.roomId}`,
          },
          handleChanges,
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "engagement_session",
            filter: `id=eq.${this.roomId}`,
          },
          handleChanges,
        )
        .subscribe();
    }

    return listenerId;
  }

  unsubscribe(listenerId: string): void {
    this.listeners.delete(listenerId);
    if (this.listeners.size === 0 && this.channel) {
      this.supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }

  async addPlayer(sessionId: string, player: any): Promise<void> {
    const { data, error } = await this.supabase
      .from("engagement_session")
      .select("state")
      .eq("id", this.roomId)
      .single();
    if (error) throw error;

    const state = data.state as T;
    if (state.players) {
      state.players[sessionId] = player;
      await this.updateState(state);
    }
  }

  async removePlayer(sessionId: string): Promise<void> {
    const { data, error } = await this.supabase
      .from("engagement_session")
      .select("state")
      .eq("id", this.roomId)
      .single();
    if (error) throw error;

    const state = data.state as T;
    if (state.players) {
      delete state.players[sessionId];
      await this.updateState(state);
    }
  }
}
