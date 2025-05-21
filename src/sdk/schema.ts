export interface User {
  id: string;
  username: string;
  avatar_url?: string | null;
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  points_required?: number;
  position_required?: number;
  should_award_individual?: boolean;
  created_at: string;
  image_url?: string | null;
  modifier?: string | null;
}

export interface BaseGameState<P extends BasePlayerState> {
  players: Record<string, P>;
  code: string;
  game_type: "winner-loser" | "ranked" | "team-winner-loser" | "team-ranked";
  phase: "waiting" | "active" | "ended";
  engagement_name: string;
  game_starts_by: string;
  game_started_at?: string | null;
  created_at: string;
  game_ends_by: string;
  game_ended_at?: string | null;
  not_enough_players?: boolean;
  was_stalemate?: boolean;
  rewards: Reward[];
  min_players?: number | null;
  max_players?: number | null;
  timeout_interval?: number | null;
  waiting_room_interval?: number | null;
  waiting_room_image_url?: string | null;
  waiting_room_caption?: string | null;
  waiting_room_reward_image_url?: string | null;
  waiting_room_reward_caption?: string | null;
  primary_color?: string | null;
  company_name?: string | null;
  company_logo_url?: string | null;
  [key: string]: any;
}

export interface BasePlayerState {
  session_id: string;
  user_id: string;
  username: string;
  avatar_url?: string | null;
  is_active: boolean;
  current_emojis?: Record<number, string> | null;
  created_at: string;
  position?: number | null;
  points_won?: number | null;
  summary_caption?: string | null;
  reward_id_won?: string | null;
  [key: string]: any;
}

export const baseInitialState: BaseGameState<BasePlayerState> = {
  players: {},
  game_type: "winner-loser",
  phase: "waiting",
  waiting_room_interval: 30000,
  rewards: [],
} as unknown as BaseGameState<BasePlayerState>;

export type BaseMessageType = "send_emoji" | string;

export type BaseMessagePayloads = {
  send_emoji: {
    emoji: string;
  };
} & Record<string, any>;
