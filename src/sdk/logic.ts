import {
  BaseGameState,
  BaseMessagePayloads,
  BaseMessageType,
  BasePlayerState,
} from "./schema";
import { SupabaseAdapter } from "./supabase-adapter";

const EMOJI_TIMEOUT = 3000;

interface IGameLogic<
  T extends BaseGameState<P>,
  P extends BasePlayerState,
  M extends BaseMessageType,
  MP extends BaseMessagePayloads,
> {
  handleMessage(message: M, data: MP[M], sender?: P | null): void;
  onRegisterPlayer(
    user_id: string,
    username?: string | null,
    avatar_url?: string | null,
  ): P;
  onPlayerLeave(session_id: string): void;
  onSendEmoji(player: P, emoji: string): void;
  cleanup(): void;
}

export class GameLogic<
  T extends BaseGameState<P>,
  P extends BasePlayerState,
  M extends BaseMessageType,
  MP extends BaseMessagePayloads,
> implements IGameLogic<T, P, M, MP>
{
  protected adapter: SupabaseAdapter<T, P>;
  protected state: T;
  private emojiTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor(state: T, adapter: SupabaseAdapter<T, P>) {
    this.state = state;
    this.adapter = adapter;
  }

  setState(state: T) {
    this.state = state;
  }

  public handleMessage(message: M, data: MP[M], sender?: P | null): void {
    if (!sender?.user_id) {
      console.log("[GameLogic] Received message without sender", message, data);
      return;
    }
    switch (message) {
      case "send_emoji":
        if (sender) {
          this.onSendEmoji(sender, data.emoji);
        }
        break;
    }
  }

  public onRegisterPlayer(
    session_id: string,
    username?: string | null,
    avatar_url?: string | null,
    initialPlayerState?: Partial<P>,
  ): P {
    if (
      this.state.max_players &&
      Object.keys(this.state.players).length >= this.state.max_players
    ) {
      throw new Error("Max players reached");
    }
    console.log("[GameLogic] Registering player", username, initialPlayerState);
    const player = {
      session_id: session_id,
      username: username,
      avatar_url: avatar_url,
      created_at: new Date().toISOString(),
      is_active: true,
      user_id: session_id,
      ...initialPlayerState,
    } as P;
    this.adapter.addPlayer(session_id, player);
    return player;
  }

  public onPlayerLeave(session_id: string): void {
    this.clearPlayerEmojiTimeouts(session_id);
    this.adapter.removePlayer(session_id);
  }

  private clearPlayerEmojiTimeouts(session_id: string): void {
    // Clear all emoji timeouts for a specific player
    for (const [timeoutKey, timeout] of this.emojiTimeouts.entries()) {
      if (timeoutKey.startsWith(`${session_id}:`)) {
        clearTimeout(timeout);
        this.emojiTimeouts.delete(timeoutKey);
      }
    }
  }

  public onSendEmoji(player: P, emoji: string) {
    const emojiId = new Date().getTime().toString();
    const timeoutKey = `${player.session_id}:${emojiId}`;

    // Update player's emoji state
    this.adapter.updateState({
      ...this.state,
      players: {
        ...this.state.players,
        [player.session_id]: {
          ...player,
          current_emojis: {
            ...player.current_emojis,
            [emojiId]: emoji,
          },
        },
      },
    });

    // Set new timeout and store its reference
    const timeout = setTimeout(() => {
      // Safely access player using string indexing
      const players = this.state.players as Record<string, P>;
      const currentPlayer = players[player.session_id];

      if (currentPlayer && currentPlayer.current_emojis) {
        // Safely access emojis using string indexing
        const currentEmojis = currentPlayer.current_emojis as Record<
          string,
          string
        >;

        if (currentEmojis[emojiId]) {
          // Create a new emoji object without the expired emoji
          const updatedEmojis = { ...currentEmojis };
          delete updatedEmojis[emojiId];

          this.adapter.updateState({
            ...this.state,
            players: {
              ...this.state.players,
              [player.session_id]: {
                ...currentPlayer,
                current_emojis: updatedEmojis,
              },
            },
          });
        }
      }

      // Clean up the timeout reference
      this.emojiTimeouts.delete(timeoutKey);
    }, EMOJI_TIMEOUT);

    this.emojiTimeouts.set(timeoutKey, timeout);
  }

  // Method to cleanup all timeouts (useful when destroying the game instance)
  public cleanup(): void {
    for (const timeout of this.emojiTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.emojiTimeouts.clear();
  }
}
