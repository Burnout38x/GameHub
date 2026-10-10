import type { MutableRefObject } from 'react';
import { MILLI, PADS_PER_SIDE } from '@/lib/fortress/content';
import type { CommandBody } from '@/lib/fortress/commands';
import { enemyOf, keepPercent, padSlot, type BattleState, type Fx, type Outcome, type Side, type Structure } from '@/lib/fortress/state';

/** The small slice of battle state the DOM HUD re-renders from (about ten times a second). */
export interface Hud {
  tick: number;
  endTick: number;
  overdrive: boolean;
  elixir: number;
  gold: number;
  myKeep: number;
  enemyKeep: number;
  myUnits: number;
  enemyUnits: number;
  /** Your six plots, front and back, for the builder. */
  plots: (Structure | null)[];
  plotKey: string;
}

export interface Ghost { id: number; lane: number; emoji: string; until: number }

/** What the battle screen needs from either a local (vs Machine) or an online match. */
export interface BattleDriver {
  stateRef: MutableRefObject<BattleState | null>;
  fxRef: MutableRefObject<Fx[]>;
  lastStepRef: MutableRefObject<number>;
  hud: Hud | null;
  mySide: Side;
  myPlayer: number;
  countdown: number;
  outcome: Outcome | null;
  ghosts: Ghost[];
  connection: 'live' | 'syncing' | 'offline';
  paused: boolean;
  canPause: boolean;
  togglePause: () => void;
  send: (body: CommandBody) => Promise<string | null>;
}

export function readHud(state: BattleState, player: number, side: Side): Hud {
  const wallet = state.wallets[player];
  const enemy = enemyOf(side);
  const plots = Array.from({ length: PADS_PER_SIDE }, (_, pad) => {
    const structure = state.pads[padSlot(side, pad)];
    return structure ? { ...structure } : null;
  });
  return {
    tick: state.tick,
    endTick: state.endTick,
    overdrive: state.tick >= state.overdriveFrom,
    elixir: wallet ? wallet.elixir / MILLI : 0,
    gold: wallet?.gold ?? 0,
    myKeep: keepPercent(state, side),
    enemyKeep: keepPercent(state, enemy),
    myUnits: state.units.filter(unit => unit.side === side).length,
    enemyUnits: state.units.filter(unit => unit.side === enemy).length,
    plots,
    plotKey: plots.map(p => (p ? `${p.def}${p.level}:${p.hp}` : '-')).join(','),
  };
}

/** A HUD update is only worth a React render when something visible changed. */
export function hudChanged(a: Hud | null, b: Hud): boolean {
  if (!a) return true;
  return a.gold !== b.gold || Math.floor(a.elixir * 10) !== Math.floor(b.elixir * 10) || a.myKeep !== b.myKeep || a.enemyKeep !== b.enemyKeep
    || Math.floor(a.tick / 10) !== Math.floor(b.tick / 10) || a.overdrive !== b.overdrive || a.myUnits !== b.myUnits || a.enemyUnits !== b.enemyUnits || a.plotKey !== b.plotKey;
}

export const formatClock = (ticks: number): string => {
  const seconds = Math.max(0, Math.ceil(ticks / 10));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};
