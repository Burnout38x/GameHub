'use client';
import type { BowlView } from '@/lib/bowl/view';
import type { DilemmaView } from '@/lib/dilemma/view';
import type { WhotView } from '@/lib/whot/view';
import type { RoomPlayer } from '@/lib/types';
import BowlPlay from './BowlPlay';
import DilemmaPlay from './DilemmaPlay';
import WhotPlay from './WhotPlay';
import { Podium } from './parts';

type AnyView = BowlView | DilemmaView | WhotView;

/** Picks the right screen for a live room game from the server's view. */
export default function LivePlay({ code, view, userId, refresh }: { code: string; view: AnyView | undefined; userId: string; refresh: () => void }) {
  if (!view) return <div className="glass p-6 text-center" role="status">Setting the table…</div>;
  if (view.kind === 'bowl') return <BowlPlay code={code} initial={view} userId={userId} onFinished={refresh} />;
  if (view.kind === 'dilemma') return <DilemmaPlay code={code} initial={view} userId={userId} onFinished={refresh} />;
  return <WhotPlay code={code} initial={view} onFinished={refresh} />;
}

/** Final podium for a finished live game. */
export function LiveResults({ view, players }: { view: AnyView | undefined; players: RoomPlayer[] }) {
  if (!view) return null;
  if (view.kind === 'whot') {
    const rows = view.seats.map(seat => ({ id: seat.id, name: seat.name, points: view.wins[seat.id] ?? 0 })).sort((a, b) => b.points - a.points);
    return <Podium rows={rows} unit={view.hands > 1 ? 'hands' : 'hand'} />;
  }
  const present = new Set(players.map(player => player.profile_id));
  const rows = view.standings.filter(standing => present.has(standing.id)).map(standing => ({ id: standing.id, name: standing.name, points: standing.points }));
  return <Podium rows={rows} unit="pts" />;
}
