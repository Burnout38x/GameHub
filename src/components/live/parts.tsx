'use client';
import s from './Live.module.css';

/** Small pieces shared by the live game screens. */

export function CountdownRing({ deadline, seconds, now, color = 'var(--accent)' }: { deadline: number; seconds: number; now: number; color?: string }) {
  const left = now ? Math.min(seconds * 1000, Math.max(0, deadline - now)) : seconds * 1000;
  const fraction = Math.min(1, left / Math.max(1, seconds * 1000));
  const shown = Math.ceil(left / 1000);
  const circumference = 2 * Math.PI * 23;
  const urgent = shown <= 5;
  return (
    <div className={`${s.ring} ${urgent ? s.urgent : ''}`} role="timer" aria-label={`${shown} seconds left`}>
      <svg viewBox="0 0 54 54" aria-hidden="true">
        <circle className={s.ringTrack} cx="27" cy="27" r="23" />
        <circle className={s.ringFill} cx="27" cy="27" r="23" stroke={urgent ? '#f87171' : color} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - fraction)} />
      </svg>
      <span className={s.ringText} aria-hidden="true">{shown}</span>
    </div>
  );
}

export interface BoardRow { id: string; name: string; points: number; gain?: number; note?: string }

export function Standings({ rows, me, title = 'Standings' }: { rows: BoardRow[]; me: string; title?: string }) {
  return (
    <section aria-label={title}>
      <h3 className="mb-2 text-xs font-black uppercase tracking-widest text-white/60">{title}</h3>
      <ol className={s.board}>
        {rows.map((row, index) => (
          <li key={row.id} className={`${s.row} ${row.id === me ? s.rowMe : ''}`} style={{ animationDelay: `${index * 60}ms` }}>
            <span className={s.rank}>{index + 1}</span>
            <span className={s.name}>{row.name}{row.id === me ? ' (you)' : ''}{row.note ? <span className="ml-2 text-xs font-bold text-white/60">{row.note}</span> : null}</span>
            {row.gain ? <span className={s.gain}>+{row.gain}</span> : null}
            <span className={s.pts}>{row.points.toLocaleString()}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Podium({ rows, unit }: { rows: BoardRow[]; unit: string }) {
  const [first, second, third] = rows;
  const step = (row: BoardRow | undefined, place: 1 | 2 | 3) => (
    <div className={s.step}>
      {row ? <>
        <span className="text-2xl" aria-hidden="true">{place === 1 ? '👑' : place === 2 ? '🥈' : '🥉'}</span>
        <span className="max-w-full truncate text-sm font-black">{row.name}</span>
        <span className="text-xs font-bold text-white/65">{row.points.toLocaleString()} {unit}</span>
      </> : null}
      <div className={`${s.block} ${place === 1 ? s.p1 : place === 2 ? s.p2 : s.p3}`} aria-hidden="true">{row ? place : ''}</div>
    </div>
  );
  return (
    <div className={`${s.card}`} style={{ ['--tint' as string]: '#f59e0b' }}>
      <h2 className="mb-4 text-center text-2xl font-black">Final standings</h2>
      <div className={s.podium} role="list" aria-label="Podium">
        <div role="listitem" aria-label={second ? `Second: ${second.name}, ${second.points} ${unit}` : 'Second place empty'}>{step(second, 2)}</div>
        <div role="listitem" aria-label={first ? `Winner: ${first.name}, ${first.points} ${unit}` : 'No winner'}>{step(first, 1)}</div>
        <div role="listitem" aria-label={third ? `Third: ${third.name}, ${third.points} ${unit}` : 'Third place empty'}>{step(third, 3)}</div>
      </div>
    </div>
  );
}

export function MuteButton({ muted, onToggle }: { muted: boolean; onToggle: () => void }) {
  return <button type="button" className={s.iconBtn} onClick={onToggle} aria-pressed={muted} aria-label={muted ? 'Turn sound on' : 'Turn sound off'}>{muted ? '🔇' : '🔊'}</button>;
}

export const LETTERS = ['A', 'B', 'C', 'D'];
/** Answer tile colours, bright enough for white text in every theme. */
export const TILE_COLORS = ['#c2410c', '#0f766e', '#6d28d9', '#be185d'];
