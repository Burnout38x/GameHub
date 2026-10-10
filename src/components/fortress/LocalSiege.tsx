'use client';
import { useCallback, useState } from 'react';
import Link from 'next/link';
import type { FortressDesign } from '@/lib/fortress/design';
import { MISSIONS, SKIRMISH_LEVELS } from '@/lib/fortress/missions';
import { missionStars, sideScore, type MatchSetup, type MatchState } from '@/lib/fortress/match';
import { royalsOf } from '@/lib/fortress/world';
import SiegeBattle from './SiegeBattle';
import { useLocalSiege } from './useLocalSiege';
import { themeFor } from './theme';
import s from './Siege.module.css';

export interface LocalResult { won: boolean; stars: number; shots: number; mission: number | null }
type SaveState = { status: 'idle' | 'saving' | 'saved' | 'guest' | 'error'; message: string };

interface Props {
  setup: MatchSetup;
  design: FortressDesign;
  seed: number;
  onResult: (result: LocalResult) => void;
  onExit: () => void;
  onRetry: () => void;
  onRebuild: () => void;
  onNext: (() => void) | null;
}

export function enemyLabel(setup: MatchSetup): string {
  if (setup.kind === 'mission') {
    const mission = MISSIONS.find(entry => entry.id === setup.mission);
    return mission ? `${mission.emoji} ${mission.name}` : 'The Machine';
  }
  if (setup.kind === 'skirmish') return `🤖 ${SKIRMISH_LEVELS[setup.level - 1]?.label ?? 'The Machine'}`;
  return 'The Machine';
}

/** One battle against the Machine, its result card and the campaign save. */
export default function LocalSiege({ setup, design, seed, onResult, onExit, onRetry, onRebuild, onNext }: Props) {
  const [save, setSave] = useState<SaveState>({ status: 'idle', message: '' });

  const handleFinish = useCallback((match: MatchState) => {
    const won = match.result?.winner === 0;
    const stars = setup.kind === 'mission' ? missionStars(match) : 0;
    const shots = match.players[0].shots;
    onResult({ won, stars, shots, mission: setup.kind === 'mission' ? setup.mission : null });
    if (setup.kind !== 'mission' || !won) return;
    setSave({ status: 'saving', message: 'Saving your victory…' });
    fetch('/api/fortress-feud', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mission: setup.mission, stars, shots }) })
      .then(async response => {
        const data = await response.json().catch(() => ({}));
        if (response.status === 401) setSave({ status: 'guest', message: 'Stars saved on this device. Sign in to keep them on your profile.' });
        else if (!response.ok) setSave({ status: 'error', message: data.error || 'Could not save your victory.' });
        else setSave({ status: 'saved', message: data.points ? `Victory recorded · +${data.points} points.` : 'Victory recorded.' });
      })
      .catch(() => setSave({ status: 'error', message: 'You are offline. Stars are saved on this device.' }));
  }, [setup, onResult]);

  const siege = useLocalSiege(setup, design, seed, 'You', handleFinish);
  const { match } = siege;
  const result = siege.playback ? null : match.result;
  const mission = setup.kind === 'mission' ? MISSIONS.find(entry => entry.id === setup.mission) : null;

  const overlay = result && (() => {
    const won = result.winner === 0;
    const draw = result.winner === null;
    const stars = mission ? missionStars(match) : 0;
    return (
      <div className={s.overlay} role="dialog" aria-modal="true" aria-labelledby="siege-result">
        <div className={`glass ${s.result} result-enter`}>
          <div aria-hidden="true" className="text-5xl">{won ? '🏆' : draw ? '🤝' : '💥'}</div>
          <h2 id="siege-result" className={s.resultTitle}>{won ? 'Victory!' : draw ? 'Stalemate' : 'Defeat'}</h2>
          <p className="mt-2 text-sm text-white/70">{result.reason === 'royals' ? (won ? 'Every enemy royal is down.' : 'Your royals have fallen.') : 'Out of ammunition — the stronger fortress wins.'}</p>
          {mission && <p className={s.stars} aria-label={`${stars} of 3 stars`}>{[1, 2, 3].map(n => <span key={n} className={n <= stars ? '' : s.starOff}>⭐</span>)}</p>}
          {mission && <p className="text-xs text-white/60">⭐ win · ⭐ no royal lost · ⭐ win in {mission.par} shots or fewer</p>}
          <dl className={s.stats}>
            <div className={s.stat}><dt>Shots</dt><dd><strong>{match.players[0].shots}</strong></dd></div>
            <div className={s.stat}><dt>Your royals</dt><dd><strong>{royalsOf(match.world, 0).length}/{match.royalCount[0]}</strong></dd></div>
            <div className={s.stat}><dt>Score</dt><dd><strong>{sideScore(match, 0)}</strong></dd></div>
          </dl>
          {save.message && <p role="status" className={`mt-3 text-sm ${save.status === 'error' ? 'text-red-300' : 'text-[#9cddd2]'}`}>{save.message}{save.status === 'guest' && <> <Link href="/login?next=/play/fortress-feud" className="font-bold underline">Sign in</Link></>}</p>}
          <div className="mt-4 grid gap-2">
            {won && onNext && <button type="button" className="btn" onClick={onNext}>Next mission →</button>}
            <button type="button" className={won && onNext ? 'btn-secondary' : 'btn'} onClick={onRetry}>{won ? 'Play again' : 'Try again'}</button>
            <button type="button" className="btn-secondary" onClick={onRebuild}>Rebuild my fortress</button>
            <button type="button" className="btn-secondary" onClick={onExit}>Back to the war room</button>
          </div>
        </div>
      </div>
    );
  })();

  return (
    <SiegeBattle
      match={match}
      playback={siege.playback}
      onPlaybackDone={siege.done}
      mine={[0]}
      viewSide={0}
      sideNames={['Your fortress', enemyLabel(setup)]}
      theme={themeFor(setup, seed)}
      waiting={siege.thinking ? "🤖 The Machine is lining up a shot…" : null}
      busy={false}
      error={siege.error}
      onAction={siege.act}
      onQuit={onExit}
      quitLabel="Retreat"
      overlay={overlay}
    />
  );
}
