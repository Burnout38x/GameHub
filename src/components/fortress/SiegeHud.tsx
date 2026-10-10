'use client';
import { AMMO, type AmmoId } from '@/lib/fortress/content';
import { shotAllowance, type MatchState, type ShotRecord } from '@/lib/fortress/match';
import { royalHealth, royalsOf, type Side } from '@/lib/fortress/world';
import { SIDE_COLORS } from './scene/art';
import s from './Siege.module.css';

const ROLE_ICON = { king: '👑', knight: '🛡️' } as const;

/** One side's banner: who, royals standing, and the purse of whoever fights for it. */
export function SideCard({ match, side, label, align }: { match: MatchState; side: Side; label: string; align: 'left' | 'right' }) {
  const royals = royalsOf(match.world, side);
  const fallen = Math.max(0, match.royalCount[side] - royals.length);
  const health = royalHealth(match.world, side, match.royalMax[side]);
  const fighters = match.players.map((player, index) => ({ player, index })).filter(entry => entry.player.side === side);
  return (
    <div className={`${s.card} ${align === 'right' ? s.cardRight : ''}`}>
      <div className={s.who}>
        <span className={s.dot} style={{ background: SIDE_COLORS[side].main }} aria-hidden="true" />
        <span className={s.name}>{label}</span>
      </div>
      <div className={s.royals}>
        <span className="sr-only">{`${royals.length} of ${match.royalCount[side]} royals standing, ${health}% health`}</span>
        {royals.map(royal => <span key={royal.id} aria-hidden="true">{ROLE_ICON[royal.role]}</span>)}
        {Array.from({ length: fallen }, (_, index) => <span key={`down-${index}`} className={s.royalDown} aria-hidden="true">💀</span>)}
        <span className="ml-1 text-xs font-black" aria-hidden="true">{health}%</span>
      </div>
      {fighters.map(({ player, index }) => (
        <div key={index} className={s.purse}>
          {fighters.length > 1 && <span>{player.name}</span>}
          <span className={s.gold}><span aria-hidden="true">🪙 </span>{player.gold}<span className="sr-only"> gold</span></span>
          <span className={s.elixir}><span aria-hidden="true">💧 </span>{player.elixir}<span className="sr-only"> elixir</span></span>
          <span><span aria-hidden="true">🎯 </span>{shotAllowance(match, index) - player.shots}<span className="sr-only"> shots left</span></span>
        </div>
      ))}
    </div>
  );
}

export function WindGauge({ wind }: { wind: number }) {
  const strength = Math.abs(wind);
  const label = strength < 0.05 ? 'Calm' : `${strength.toFixed(1)} ${wind > 0 ? '→' : '←'}`;
  const words = strength < 0.05 ? 'No wind' : `Wind ${strength.toFixed(1)} blowing ${wind > 0 ? 'right' : 'left'}`;
  return (
    <span className={s.wind}>
      <span aria-hidden="true">🌬️</span>
      <span aria-hidden="true">{label}</span>
      <span className="sr-only">{words}</span>
    </span>
  );
}

export function AmmoTray({ ammo, onPick, afford, disabled }: { ammo: AmmoId; onPick: (id: AmmoId) => void; afford: (id: AmmoId) => boolean; disabled: boolean }) {
  return (
    // Focusable so keyboard users can scroll the tray even when every round is out of reach.
    <div className={s.ammo} role="group" aria-label="Ammunition" tabIndex={0}>
      {(Object.keys(AMMO) as AmmoId[]).map((id, index) => {
        const item = AMMO[id];
        const cost = item.elixir ? `💧${item.elixir}` : item.gold ? `🪙${item.gold}` : 'Free';
        return (
          <button
            key={id}
            type="button"
            className={`${s.chip} ${ammo === id ? s.chipOn : ''}`}
            aria-pressed={ammo === id}
            disabled={disabled || !afford(id)}
            onClick={() => onPick(id)}
            title={`${item.name}: ${item.blurb} (key ${index + 1})`}
          >
            <span className={s.chipEmoji} aria-hidden="true">{item.emoji}</span>
            <span className={s.chipName}>{item.name}</span>
            <span className={s.chipCost} style={{ color: item.elixir ? '#f0abfc' : '#fde68a' }}>{cost}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Plain-language summary of the last shot for the toast and screen readers. */
export function describeShot(match: MatchState, shot: ShotRecord): string {
  const who = match.players[shot.player]?.name ?? 'Someone';
  const enemy: Side = shot.side === 0 ? 1 : 0;
  const dealt = shot.damage[enemy];
  const kos = shot.knockouts.filter(side => side === enemy).length;
  const own = shot.knockouts.filter(side => side === shot.side).length;
  const parts = [dealt > 0 ? `${who}’s ${AMMO[shot.ammo].name} dealt ${dealt} damage` : `${who}’s ${AMMO[shot.ammo].name} missed`];
  if (kos) parts.push(kos === 1 ? 'a royal was knocked out!' : `${kos} royals were knocked out!`);
  if (own) parts.push(`but ${own === 1 ? 'a royal' : `${own} royals`} fell at home`);
  if (shot.earned > 0) parts.push(`+${shot.earned} gold`);
  return parts.join(' · ');
}
