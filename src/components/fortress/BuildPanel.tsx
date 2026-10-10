'use client';
import { DEFENSES, DEFENSE_ORDER, LANES, MAX_LEVEL, SELL_REFUND_PERCENT, levelScale, upgradeCost, type DefenseId } from '@/lib/fortress/content';
import type { CommandBody } from '@/lib/fortress/commands';
import type { Structure } from '@/lib/fortress/state';
import styles from './Fortress.module.css';

const LANE_NAMES = ['Left', 'Middle', 'Right'];
export const padName = (pad: number, flipped: boolean): string => {
  const lane = pad % LANES;
  const viewLane = flipped ? LANES - 1 - lane : lane;
  return `${LANE_NAMES[viewLane]} ${pad >= LANES ? 'front' : 'back'} plot`;
};

type Props = {
  pad: number | null;
  structure: Structure | null;
  gold: number;
  flipped: boolean;
  onOrder: (body: CommandBody) => void;
  onSelectPad: (pad: number | null) => void;
  occupied: boolean[];
};

/** Plot inspector: build on an empty plot, or upgrade/sell what stands there. */
export default function BuildPanel({ pad, structure, gold, flipped, onOrder, onSelectPad, occupied }: Props) {
  // Front plots first, left to right as you see them, so the list mirrors the battlefield.
  const laneOrder = flipped ? [2, 1, 0] : [0, 1, 2];
  const ordered = [...laneOrder.map(lane => lane + LANES), ...laneOrder];
  return (
    <aside className={pad === null ? styles.buildHidden : styles.build} aria-label="Fortress builder">
      <div className={styles.buildHead}>
        <div>
          <p className="eyebrow">Fortress</p>
          <h2 className={styles.buildTitle}>{pad === null ? 'Tap a plot to build' : padName(pad, flipped)}</h2>
        </div>
        {pad !== null && <button type="button" className={`${styles.iconButton} ${styles.closeOnWide}`} onClick={() => onSelectPad(null)} aria-label="Close builder">✕</button>}
      </div>
      <div className={styles.padList} role="group" aria-label="Your plots">
        {ordered.map(p => (
          <button key={p} type="button" className="btn-secondary !min-h-11 !rounded-xl !px-2 !py-1 !text-xs" aria-pressed={pad === p} onClick={() => onSelectPad(pad === p ? null : p)}>
            {occupied[p] ? '🏗️' : '➕'} {padName(p, flipped).replace(' plot', '')}
          </button>
        ))}
      </div>
      {pad === null && <p className={styles.note}>Gold builds walls, towers and mines on the six plots in front of your keep. Defenses only guard their own lane.</p>}
      {pad !== null && !structure && (
        <div className={styles.buildGrid}>
          {DEFENSE_ORDER.map((id: DefenseId) => {
            const def = DEFENSES[id];
            const short = gold < def.cost;
            return (
              <button key={id} type="button" className={styles.buildOption} disabled={short} onClick={() => onOrder({ k: 'build', pad, def: id })} aria-label={`Build ${def.name} for ${def.cost} gold. ${def.blurb}`}>
                <span className={styles.buildEmoji} aria-hidden="true">{def.emoji}</span>
                <span><span className={styles.buildName}>{def.name}</span><span className={styles.buildMeta}><span className={styles.price}>🪙 {def.cost}</span> · {def.blurb}</span></span>
              </button>
            );
          })}
        </div>
      )}
      {pad !== null && structure && structure.def !== 'keep' && (() => {
        const def = DEFENSES[structure.def];
        const maxed = structure.level >= MAX_LEVEL;
        const cost = upgradeCost(structure.def, structure.level);
        const refund = Math.floor((structure.spent * SELL_REFUND_PERCENT) / 100);
        return (
          <div className="flex flex-col gap-2">
            <p className="text-sm"><span aria-hidden="true">{def.emoji}</span> <strong>{def.name}</strong> · Level {structure.level} · {structure.hp}/{structure.maxHp} HP</p>
            {def.damage > 0 && <p className={styles.note}>Hits for {levelScale(def.damage, structure.level)} · range {def.range}{def.slowTicks ? ' · slows' : ''}{def.splash ? ' · splash' : ''}</p>}
            {def.income > 0 && <p className={styles.note}>Earns {def.income * structure.level} gold per second.</p>}
            <button type="button" className="btn !min-h-12" disabled={maxed || gold < cost} onClick={() => onOrder({ k: 'upgrade', pad })}>
              {maxed ? 'Max level ⭐⭐⭐' : `⬆️ Upgrade to level ${structure.level + 1} · 🪙 ${cost}`}
            </button>
            <button type="button" className="btn-secondary !min-h-11" onClick={() => onOrder({ k: 'sell', pad })}>Sell for 🪙 {refund}</button>
          </div>
        );
      })()}
    </aside>
  );
}
