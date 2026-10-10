'use client';
import { CARDS, CARD_ORDER, MAX_ELIXIR, MILLI, type CardId } from '@/lib/fortress/content';
import type { Hud } from './driver';
import styles from './Fortress.module.css';

type Props = {
  hud: Hud | null;
  armed: CardId | null;
  onArm: (card: CardId | null) => void;
};

/** Elixir, gold and the troop hand. Number keys 1–7 arm a card. */
export default function CardDock({ hud, armed, onArm }: Props) {
  const elixir = hud?.elixir ?? 0;
  const maxElixir = MAX_ELIXIR / MILLI;
  return (
    <footer className={styles.dock}>
      <div className={styles.wallet}>
        <span className={styles.gold} aria-label={`${hud?.gold ?? 0} gold`}><span aria-hidden="true">🪙</span>{hud?.gold ?? 0}</span>
        <div className={styles.elixir} role="meter" aria-label="Elixir" aria-valuemin={0} aria-valuemax={maxElixir} aria-valuenow={Math.floor(elixir)}>
          <div className={styles.elixirFill} style={{ width: `${(elixir / maxElixir) * 100}%` }} />
          <div className={styles.elixirTicks} aria-hidden="true">{Array.from({ length: 10 }, (_, i) => <span key={i} />)}</div>
          <span className={styles.elixirLabel} aria-hidden="true">💧 {Math.floor(elixir)} / {maxElixir}</span>
        </div>
      </div>
      <div className={styles.cards} role="group" aria-label="Troops and spells">
        {CARD_ORDER.map((id, index) => {
          const card = CARDS[id];
          const ready = elixir >= card.cost;
          return (
            <button
              key={id}
              type="button"
              className={`${styles.card} ${ready ? '' : styles.cardLow} ${armed === id ? styles.cardArmed : ''}`}
              aria-pressed={armed === id}
              aria-label={`${card.name}, ${card.cost} elixir. ${card.blurb}`}
              title={card.blurb}
              onClick={() => onArm(armed === id ? null : id)}
            >
              <span className={styles.cost} aria-hidden="true">{card.cost}</span>
              <span className={styles.key} aria-hidden="true">{index + 1}</span>
              <span className={styles.cardEmoji} aria-hidden="true">{card.emoji}</span>
              <span className={styles.cardName}>{card.name}</span>
            </button>
          );
        })}
      </div>
    </footer>
  );
}
