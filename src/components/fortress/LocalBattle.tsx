'use client';
import { useCallback, useState } from 'react';
import Link from 'next/link';
import { MISSIONS, SKIRMISH_LEVELS } from '@/lib/fortress/content';
import type { BattleCommand } from '@/lib/fortress/commands';
import { crowns, missionStars } from '@/lib/fortress/sim';
import { keepPercent, type BattleSetup, type BattleState } from '@/lib/fortress/state';
import BattleArena from './BattleArena';
import { useLocalBattle } from './useLocalBattle';
import styles from './Fortress.module.css';

export interface LocalResult { won: boolean; stars: number; seconds: number; mission: number | null }
type SaveState = { status: 'idle' | 'saving' | 'saved' | 'guest' | 'error'; message: string };

type Props = {
  setup: BattleSetup;
  seed: number;
  playerName: string;
  onResult: (result: LocalResult) => void;
  onExit: () => void;
  onRetry: () => void;
  onNext: (() => void) | null;
};

interface Summary { won: boolean; draw: boolean; stars: number; seconds: number; keep: number; enemyKeep: number; crowns: number; deployed: number }

/** One battle against the Machine, plus its result card and verified save. */
export default function LocalBattle({ setup, seed, playerName, onResult, onExit, onRetry, onNext }: Props) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [save, setSave] = useState<SaveState>({ status: 'idle', message: '' });
  const mission = setup.kind === 'mission' ? MISSIONS.find(m => m.id === setup.mission) : null;
  const enemyName = mission ? `${mission.emoji} ${mission.name}` : setup.kind === 'skirmish' ? `🤖 ${SKIRMISH_LEVELS[setup.level - 1].label}` : 'The Machine';

  const handleFinish = useCallback((state: BattleState, log: BattleCommand[]) => {
    const won = state.outcome?.winner === 0;
    const stars = setup.kind === 'mission' ? missionStars(state) : 0;
    const seconds = Math.floor((state.outcome?.tick ?? state.tick) / 10);
    setSummary({ won, draw: state.outcome?.winner === null, stars, seconds, keep: keepPercent(state, 0), enemyKeep: keepPercent(state, 1), crowns: crowns(state, 0), deployed: state.stats[0].deployed });
    onResult({ won, stars, seconds, mission: setup.kind === 'mission' ? setup.mission : null });
    if (setup.kind !== 'mission' || !won) return;
    setSave({ status: 'saving', message: 'Verifying your victory…' });
    fetch('/api/fortress-feud', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mission: setup.mission, seed, log }) })
      .then(async response => {
        const data = await response.json().catch(() => ({}));
        if (response.status === 401) setSave({ status: 'guest', message: 'Stars saved on this device. Sign in to keep them on your profile.' });
        else if (!response.ok) setSave({ status: 'error', message: data.error || 'Could not save your victory.' });
        else setSave({ status: 'saved', message: data.improved ? `New record! +${data.points} points on your profile.` : `Victory recorded · +${data.points} points.` });
      })
      .catch(() => setSave({ status: 'error', message: 'You are offline. Stars are saved on this device.' }));
  }, [setup, seed, onResult]);

  const driver = useLocalBattle(setup, seed, handleFinish);

  const endOverlay = summary && (
    <div className={styles.menu} role="dialog" aria-modal="true" aria-labelledby="battle-result-title">
      <div className={`${styles.menuCard} result-enter text-center`}>
        <div aria-hidden="true" className="text-5xl">{summary.won ? '🏆' : summary.draw ? '🤝' : '💥'}</div>
        <h2 id="battle-result-title" className="text-3xl font-black">{summary.won ? 'Victory!' : summary.draw ? 'Draw' : 'Defeat'}</h2>
        {setup.kind === 'mission' && <p className="text-3xl tracking-widest" aria-label={`${summary.stars} of 3 stars`}>{[1, 2, 3].map(n => <span key={n} className={n <= summary.stars ? '' : 'opacity-25'}>⭐</span>)}</p>}
        <dl className="grid grid-cols-3 gap-2 text-left text-xs">
          <div className="glass-sm p-2"><dt className="text-white/60">Your keep</dt><dd className="text-lg font-black">{summary.keep}%</dd></div>
          <div className="glass-sm p-2"><dt className="text-white/60">Enemy keep</dt><dd className="text-lg font-black">{summary.enemyKeep}%</dd></div>
          <div className="glass-sm p-2"><dt className="text-white/60">Crowns</dt><dd className="text-lg font-black">👑 {summary.crowns}</dd></div>
        </dl>
        {setup.kind === 'mission' && <p className="text-xs text-white/60">⭐ win · ⭐ keep above half · ⭐ destroy their keep</p>}
        {save.message && <p role="status" className={`text-sm ${save.status === 'error' ? 'text-red-300' : 'text-[#9cddd2]'}`}>{save.message}{save.status === 'guest' && <> <Link href="/login?next=/play/fortress-feud" className="font-bold underline">Sign in</Link></>}</p>}
        {summary.won && onNext && <button type="button" className="btn" onClick={onNext}>Next mission →</button>}
        <button type="button" className={summary.won && onNext ? 'btn-secondary' : 'btn'} onClick={onRetry}>{summary.won ? 'Play again' : 'Try again'}</button>
        <button type="button" className="btn-secondary" onClick={onExit}>Back to the war room</button>
      </div>
    </div>
  );

  return <BattleArena driver={driver} myName={playerName} enemyName={enemyName} quitLabel="Retreat to the war room" onQuit={onExit} endOverlay={endOverlay} hint={mission?.tip} />;
}
