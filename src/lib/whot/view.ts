import type { Shape } from './cards';
import type { WhotEvent } from './game';

/** Online Whot! timing, shared by the server engine and the table screen. */
export const TURN_SECONDS = 30;
export const BETWEEN_MS = 7000;
export const MAX_HANDS = 7;

export interface WhotSeatView { id: string; name: string; count: number; cards: number[] | null }

export interface WhotView {
  kind: 'whot';
  version: number;
  ended: boolean;
  phase: 'play' | 'between';
  deadline: number;
  hands: number;
  handNo: number;
  wins: Record<string, number>;
  turnSeconds: number;
  seats: WhotSeatView[];
  /** Your seat, or -1 when watching. */
  me: number;
  turn: number;
  pile: number[];
  pileCount: number;
  market: number;
  called: Shape | null;
  step: number;
  events: WhotEvent[];
  winners: number[] | null;
  tender: number[] | null;
}
