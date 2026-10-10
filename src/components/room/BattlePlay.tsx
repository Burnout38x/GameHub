'use client';
import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { RoomBundle } from './RoomClient';
import { callRoomApi } from '@/lib/room-api';
import { parseOnlineBattle, type BattleResult } from '@/lib/fortress/online';
import { humanSides } from '@/lib/fortress/state';
import BattleArena from '@/components/fortress/BattleArena';
import { useOnlineBattle } from '@/components/fortress/useOnlineBattle';
import type { OnlineBattle } from '@/lib/fortress/online';
import fortress from '@/components/fortress/Fortress.module.css';

/** Live Fortress Feud battle inside a room. */
export default function BattlePlay(props: RoomBundle) {
  // The battle's identity is fixed at start; live orders arrive through the battle poll.
  const [battle] = useState(() => parseOnlineBattle(props.room.round_state));
  if (!battle) return <div role="alert" className="glass p-6">This battle could not be loaded. Leave the room and start a new one.</div>;
  return <OnlineArena {...props} battle={battle} />;
}

function OnlineArena({ room, players, userId, refresh, battle }: RoomBundle & { battle: OnlineBattle }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const driver = useOnlineBattle(room.code, battle, userId, refresh);
  const sides = humanSides(battle.setup);
  const me = battle.players.indexOf(userId);
  const nameOf = (id: string) => players.find(p => p.profile_id === id)?.display_name ?? 'Player';
  const coop = battle.setup.kind === 'coop';
  const teammate = battle.players.find(id => id !== userId);
  const myName = coop && teammate ? `You + ${nameOf(teammate)}` : 'You';
  const enemyName = coop ? '🤖 The Machine' : nameOf(battle.players.find((_, index) => sides[index] !== sides[me]) ?? '');

  const quit = useCallback(async () => {
    const warning = coop ? 'Leave and end this co-op battle for both of you? No result will be recorded.' : 'Leave now? Walking out of a duel counts as a loss.';
    if (leaving || !window.confirm(warning)) return;
    setLeaving(true);
    try {
      await callRoomApi(room.code, 'leave');
      router.push('/games');
    } catch {
      setLeaving(false);
    }
  }, [coop, leaving, room.code, router]);

  const endOverlay = (
    <div className={fortress.overlay}>
      <div className={fortress.banner} role="status">⏳ Battle over — confirming the result…</div>
    </div>
  );

  return <BattleArena driver={driver} myName={myName} enemyName={enemyName} quitLabel={coop ? 'Leave battle' : 'Forfeit and leave'} onQuit={() => void quit()} endOverlay={endOverlay} />;
}

const REASONS: Record<BattleResult['reason'], string> = {
  keep: 'Keep destroyed!',
  time: 'Time’s up — the healthier keep wins.',
  forfeit: 'A commander left the battlefield.',
};

/** Short battle report shown above the regular end screen. */
export function BattleResultBanner({ room, players }: Pick<RoomBundle, 'room' | 'players'>) {
  const result = room.round_state?.result as BattleResult | null | undefined;
  if (!result) return null;
  const coop = room.mode === 'coop';
  const ids: string[] = Array.isArray(room.round_state?.players) ? room.round_state.players : [];
  const nameOf = (index: number) => players.find(p => p.profile_id === ids[index])?.display_name ?? (index === 0 ? 'Host' : 'Challenger');
  return (
    <section className="glass-sm mx-auto mt-6 w-full max-w-xl p-4 text-center" aria-label="Battle report">
      <p className="eyebrow">🏰 Battle report</p>
      <p className="mt-1 font-bold">{REASONS[result.reason]}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="glass-sm p-2"><span className="block text-xs text-white/60">{coop ? 'Your team’s keep' : `${nameOf(0)}’s keep`}</span><strong>{result.keeps[0]}% · 👑 {result.crowns[0]}</strong></div>
        <div className="glass-sm p-2"><span className="block text-xs text-white/60">{coop ? 'The Machine’s keep' : `${nameOf(1)}’s keep`}</span><strong>{result.keeps[1]}% · 👑 {result.crowns[1]}</strong></div>
      </div>
    </section>
  );
}
