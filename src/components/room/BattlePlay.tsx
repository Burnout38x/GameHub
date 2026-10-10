'use client';
import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { RoomBundle } from './RoomClient';
import EndScreen from './EndScreen';
import { callRoomApi } from '@/lib/room-api';
import { START_GOLD } from '@/lib/fortress/content';
import { DEFAULT_DESIGN, designCost } from '@/lib/fortress/design';
import { activePlayer, type MatchState } from '@/lib/fortress/match';
import { parseOnlineSiege, seatPlayer, type PublicSiege } from '@/lib/fortress/online';
import type { Side } from '@/lib/fortress/world';
import BuildScreen from '@/components/fortress/BuildScreen';
import SiegeBattle from '@/components/fortress/SiegeBattle';
import { themeFor } from '@/components/fortress/theme';
import { useOnlineSiege } from '@/components/fortress/useOnlineSiege';

/** Live Fortress Feud siege inside a room: build together, then trade shots. */
export default function BattlePlay(props: RoomBundle) {
  // The siege's identity is fixed at start; live state arrives through the battle poll.
  const [siege] = useState(() => parseOnlineSiege(props.room.round_state) as PublicSiege | null);
  if (!siege) return <div role="alert" className="glass p-6">This battle could not be loaded. Leave the room and start a new one.</div>;
  return <OnlineSiegeView {...props} initial={siege} />;
}

function OnlineSiegeView(props: RoomBundle & { initial: PublicSiege }) {
  const { room, players, userId, initial } = props;
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const driver = useOnlineSiege(room.code, initial, room.status);
  const { siege } = driver;
  const seat = siege.players.indexOf(userId);
  const coop = siege.mode === 'coop';
  const nameOf = useCallback((seatIndex: number) => {
    const id = siege.players[seatIndex];
    return id === userId ? 'You' : players.find(player => player.profile_id === id)?.display_name ?? `Player ${seatIndex + 1}`;
  }, [players, siege.players, userId]);
  const mySide: Side = coop ? 0 : (seat === 1 ? 1 : 0);

  const named = useCallback((match: MatchState | null): MatchState | null => match && {
    ...match,
    players: match.players.map((player, index) => ({ ...player, name: player.ai ? 'The Machine' : nameOf(coop && index === 2 ? 1 : index) })),
  }, [coop, nameOf]);
  const shown = useMemo(() => named(driver.shown ?? siege.match), [named, driver.shown, siege.match]);
  const playback = useMemo(() => driver.playback && { ...driver.playback, after: named(driver.playback.after)! }, [driver.playback, named]);

  const quit = useCallback(async () => {
    const warning = coop ? 'Leave and end this co-op battle for both of you? No result will be recorded.' : 'Leave now? Walking out of a duel counts as a loss once both sides have fired.';
    if (leaving || !window.confirm(warning)) return;
    setLeaving(true);
    try {
      await callRoomApi(room.code, 'leave');
      router.push('/games');
    } catch {
      setLeaving(false);
    }
  }, [coop, leaving, room.code, router]);

  // Wait for the final shot to land on this phone before showing the results.
  const finalTurn = Math.max(siege.replayTurn, parseOnlineSiege(room.round_state)?.replayTurn ?? -1);
  if ((room.status === 'finished' || driver.status === 'finished') && !driver.playback && driver.seen >= finalTurn) {
    return <><BattleResultBanner room={room} players={players} /><EndScreen {...props} /></>;
  }

  if (siege.stage === 'build' || !shown) {
    const slot = coop ? 0 : seat;
    const built = Boolean(siege.built?.[slot]);
    const secondsLeft = Math.max(0, Math.ceil((siege.deadline - driver.serverNow) / 1000));
    if (built) {
      return (
        <section className="glass mx-auto max-w-xl p-6 text-center" role="status">
          <div className="text-4xl" aria-hidden="true">🏗️</div>
          <h1 className="mt-2 text-2xl font-black">Fortress ready</h1>
          <p className="mt-2 text-white/70">Waiting for {nameOf(seat === 0 ? 1 : 0)} to finish building. The battle starts automatically in about {secondsLeft}s.</p>
        </section>
      );
    }
    return (
      <BuildScreen
        title={coop ? 'Build your shared fortress' : `Build your fortress vs ${nameOf(seat === 0 ? 1 : 0)}`}
        budget={START_GOLD}
        initial={DEFAULT_DESIGN}
        confirmLabel="🔒 Lock in my fortress"
        busy={driver.busy}
        onConfirm={design => { if (designCost(design) <= START_GOLD) driver.submitDesign(design); }}
        note={<>
          <p className="glass-sm p-3 text-sm text-white/75">⏱ About {secondsLeft}s left to build — anyone who runs out of time gets the standard keep. {coop ? `You and ${nameOf(seat === 0 ? 1 : 0)} share one fortress: whoever locks in first builds it, and you split the cost.` : 'Your opponent can’t see your design until the battle starts.'}</p>
          {driver.error && <p role="alert" className="text-sm text-red-200">{driver.error}</p>}
        </>}
      />
    );
  }

  const shooter = activePlayer(shown);
  const myPlayer = seatPlayer(siege, seat);
  const waiting = shooter.ai ? '🤖 The Machine is lining up a shot…' : `Waiting for ${shooter.name}…`;
  const sideNames: [string, string] = coop ? ['Your team', '🤖 The Machine'] : [nameOf(0), nameOf(1)];
  return (
    <SiegeBattle
      match={shown}
      playback={playback}
      onPlaybackDone={driver.done}
      mine={seat >= 0 ? [myPlayer] : []}
      viewSide={mySide}
      sideNames={sideNames}
      theme={themeFor(shown.setup, siege.seed)}
      waiting={waiting}
      deadline={shooter.ai || shown.result ? null : siege.deadline}
      clockOffset={driver.clockOffset}
      busy={driver.busy}
      rush={driver.rushing}
      error={driver.error}
      onAction={driver.order}
      onQuit={() => void quit()}
      quitLabel={coop ? 'Leave battle' : 'Forfeit'}
    />
  );
}

const REASONS = {
  royals: 'Every royal on one side was knocked out!',
  shots: 'Out of ammunition — the stronger fortress wins.',
  forfeit: 'A commander left the battlefield.',
} as const;

/** Short battle report shown above the regular end screen. */
export function BattleResultBanner({ room, players }: Pick<RoomBundle, 'room' | 'players'>) {
  const siege = parseOnlineSiege(room.round_state);
  const result = siege?.result;
  if (!siege || !result) return null;
  const coop = siege.mode === 'coop';
  const nameOf = (seat: number) => players.find(player => player.profile_id === siege.players[seat])?.display_name ?? (seat === 0 ? 'Host' : 'Challenger');
  return (
    <section className="glass-sm mx-auto mt-6 w-full max-w-xl p-4 text-center" aria-label="Battle report">
      <p className="eyebrow">🏰 Battle report</p>
      <p className="mt-1 font-bold">{REASONS[result.reason]}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="glass-sm p-2"><span className="block text-xs text-white/60">{coop ? 'Your team’s fortress' : `${nameOf(0)}’s fortress`}</span><strong>{result.score[0]} pts{result.winner === 0 ? ' · 🏆' : ''}</strong></div>
        <div className="glass-sm p-2"><span className="block text-xs text-white/60">{coop ? 'The Machine’s fortress' : `${nameOf(1)}’s fortress`}</span><strong>{result.score[1]} pts{result.winner === 1 ? ' · 🏆' : ''}</strong></div>
      </div>
    </section>
  );
}
