export type GameType = 'quiz' | 'prompt' | 'memory' | 'guess';
export type Difficulty = 'easy' | 'hard' | 'mixed';
export type RoomMode = 'classic' | 'spotlight';
export type RoomStatus = 'lobby' | 'playing' | 'finished';
export type RoundPhase = 'answering' | 'revealed';

export interface Profile {
  id: string;
  username: string;
  role: 'player' | 'admin';
  games_played: number;
  games_won: number;
  total_points: number;
  current_streak: number;
  best_streak: number;
}

export interface Game {
  id: string;
  slug: string;
  name: string;
  description: string;
  emoji: string;
  type: GameType;
  config: Record<string, any>;
  is_active: boolean;
  sort_order: number;
}

export interface Prompt {
  id: string;
  game_id: string;
  difficulty: 'easy' | 'hard';
  content: Record<string, any>;
  created_at?: string;
}

export interface Room {
  id: string;
  code: string;
  host_id: string;
  game_id: string;
  difficulty: Difficulty;
  mode: RoomMode;
  is_public: boolean;
  total_rounds: number;
  status: RoomStatus;
  current_round: number;
  turn_player_id: string | null;
  prompt_ids: string[];
  round_state: Record<string, any>;
  round_phase: RoundPhase;
  winner_ids: string[];
  created_at: string;
}

export interface RoomPlayer {
  id: string;
  room_id: string;
  profile_id: string;
  display_name: string;
  score: number;
  is_connected: boolean;
}

export interface RoundAnswer {
  id: string;
  room_id: string;
  round_index: number;
  profile_id: string;
  answer: Record<string, any>;
  is_correct: boolean | null;
  points: number;
}

export interface Achievement {
  id: string;
  slug: string;
  name: string;
  description: string;
  emoji: string;
}
