'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CARDS, CARD_ORDER, DEFENSES, DEFENSE_ORDER, MISSIONS, SKIRMISH_LEVELS } from '@/lib/fortress/content';
import { CAMPAIGN_STORAGE_KEY, MAX_STARS, campaignRank, mergeProgress, missionUnlocked, parseProgress, totalStars, type CampaignProgress } from '@/lib/fortress/campaign';
import type { BattleSetup } from '@/lib/fortress/state';
import LocalBattle, { type LocalResult } from './LocalBattle';
import hub from './FortressHub.module.css';

type Battle = { setup: BattleSetup; seed: number; key: number };
const EMPTY: CampaignProgress = { stars: {}, best: {} };
const newSeed = () => Math.floor(Math.random() * 2_000_000_000) + 1;

function readLocal(): CampaignProgress {
  try { return parseProgress(JSON.parse(localStorage.getItem(CAMPAIGN_STORAGE_KEY) ?? 'null')); } catch { return EMPTY; }
}
function writeLocal(progress: CampaignProgress) {
  try { localStorage.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify(progress)); } catch { /* Private mode: progress lasts for this visit. */ }
}

export default function FortressFeud() {
  const [progress, setProgress] = useState<CampaignProgress>(EMPTY);
  const [synced, setSynced] = useState<'unknown' | 'signed-in' | 'guest'>('unknown');
  const [selected, setSelected] = useState<number | null>(null);
  const [battle, setBattle] = useState<Battle | null>(null);

  useEffect(() => {
    let active = true;
    const local = readLocal();
    fetch('/api/fortress-feud', { cache: 'no-store' })
      .then(async response => {
        if (!active) return;
        if (response.status === 401) { setSynced('guest'); setProgress(local); return; }
        const data = await response.json();
        const remote: CampaignProgress = { stars: {}, best: {} };
        for (const row of data.missions ?? []) { remote.stars[row.mission] = row.stars; remote.best[row.mission] = row.best_seconds; }
        const merged = mergeProgress(local, parseProgress(remote));
        writeLocal(merged);
        setProgress(merged);
        setSynced('signed-in');
      })
      .catch(() => { if (active) { setProgress(local); setSynced('guest'); } });
    return () => { active = false; };
  }, []);

  const stars = totalStars(progress);
  const rank = campaignRank(stars);
  const nextMission = MISSIONS.find(mission => !progress.stars[mission.id])?.id ?? MISSIONS.length;
  const briefing = selected ? MISSIONS.find(mission => mission.id === selected)! : null;

  const start = useCallback((setup: BattleSetup) => {
    setSelected(null);
    setBattle({ setup, seed: newSeed(), key: Date.now() });
  }, []);

  const recordResult = useCallback((result: LocalResult) => {
    if (result.mission === null || !result.won) return;
    const id = result.mission;
    const next = mergeProgress(readLocal(), { stars: { [id]: result.stars }, best: { [id]: result.seconds } });
    writeLocal(next);
    setProgress(previous => mergeProgress(previous, next));
  }, []);

  const exitBattle = useCallback(() => setBattle(null), []);
  const retry = useCallback(() => setBattle(current => current && { ...current, seed: newSeed(), key: Date.now() }), []);
  const nextAfter = useMemo(() => {
    if (battle?.setup.kind !== 'mission') return null;
    const id = battle.setup.mission;
    if (id >= MISSIONS.length) return null;
    return () => start({ kind: 'mission', mission: id + 1 });
  }, [battle, start]);

  if (battle) {
    return <LocalBattle key={battle.key} setup={battle.setup} seed={battle.seed} playerName="You" onResult={recordResult} onExit={exitBattle} onRetry={retry} onNext={nextAfter} />;
  }

  return (
    <div className="flex flex-col gap-8">
      <section className={hub.hero} aria-labelledby="fortress-title">
        <div className={hub.scene} aria-hidden="true">
          <span className={hub.castleLeft}>🏰</span>
          <span className={hub.river} />
          <span className={hub.castleRight}>🏯</span>
          <span className={`${hub.marcher} ${hub.m1}`}>⚔️</span>
          <span className={`${hub.marcher} ${hub.m2}`}>🗿</span>
          <span className={`${hub.marcher} ${hub.m3}`}>👺</span>
          <span className={`${hub.marcherBack} ${hub.m4}`}>🏹</span>
          <span className={`${hub.marcherBack} ${hub.m5}`}>🐏</span>
        </div>
        <div className={hub.heroCopy}>
          <p className="eyebrow">New · real-time strategy</p>
          <h1 id="fortress-title" className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">Fortress Feud</h1>
          <p className="mt-3 max-w-xl text-white/75">Spend <strong className="text-[#fde68a]">gold</strong> to fortify your keep. Spend <strong className="text-[#f0abfc]">elixir</strong> to send troops down three lanes. Topple the enemy keep — or hold the healthier one when the clock hits zero.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <button type="button" className="btn" onClick={() => setSelected(nextMission)}>⚔️ {stars ? 'Continue campaign' : 'Start campaign'}</button>
            <a href="#skirmish" className="btn-secondary">🤖 Quick battle</a>
            <Link href="/rooms/new?game=fortress-feud" className="btn-secondary">👥 Play a friend</Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="campaign-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Campaign · 12 missions</p>
            <h2 id="campaign-heading" className="mt-1 text-2xl font-bold">Conquer the realm</h2>
          </div>
          <div className={hub.rank} aria-label={`Rank ${rank.title}, ${stars} of ${MAX_STARS} stars`}>
            <span aria-hidden="true" className="text-2xl">{rank.emoji}</span>
            <span><strong className="block">{rank.title}</strong><span className="text-xs text-white/65">⭐ {stars}/{MAX_STARS}{rank.next ? ` · ${rank.next - stars} to next rank` : ''}</span></span>
          </div>
        </div>
        {synced === 'guest' && <p className="glass-sm mb-4 p-3 text-sm text-white/70">Playing as a guest: stars are kept on this device. <Link href="/login?next=/play/fortress-feud" className="font-bold text-[#9cddd2] underline">Sign in</Link> to save verified victories to your profile and the leaderboard.</p>}
        <ol className={hub.missions}>
          {MISSIONS.map(mission => {
            const unlocked = missionUnlocked(progress, mission.id);
            const earned = progress.stars[mission.id] ?? 0;
            return (
              <li key={mission.id}>
                <button type="button" className={`${hub.mission} ${earned ? hub.cleared : ''}`} disabled={!unlocked} onClick={() => setSelected(mission.id)} aria-label={`Mission ${mission.id}: ${mission.name}. ${unlocked ? `${earned} of 3 stars` : 'Locked'}`}>
                  <span className={hub.missionNumber}>{mission.id}</span>
                  <span aria-hidden="true" className="text-3xl">{unlocked ? mission.emoji : '🔒'}</span>
                  <span className="text-sm font-bold">{mission.name}</span>
                  <span aria-hidden="true" className="text-xs tracking-widest">{[1, 2, 3].map(n => <span key={n} className={n <= earned ? '' : 'opacity-25'}>⭐</span>)}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      {briefing && (
        <div className={hub.backdrop} role="dialog" aria-modal="true" aria-labelledby="briefing-title" onKeyDown={event => { if (event.key === 'Escape') setSelected(null); }}>
          <div className={`glass ${hub.briefing} result-enter`}>
            <p className="eyebrow">Mission {briefing.id} briefing</p>
            <h2 id="briefing-title" className="mt-1 text-3xl font-black">{briefing.emoji} {briefing.name}</h2>
            <p className="mt-3 text-white/75">{briefing.briefing}</p>
            <ul className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <li className="glass-sm p-3">🏰 Enemy keep <strong className="block">{briefing.enemyKeep.toLocaleString()} HP</strong></li>
              <li className="glass-sm p-3">🤖 Machine level <strong className="block">{SKIRMISH_LEVELS[briefing.aiLevel - 1].label}</strong></li>
              <li className="glass-sm p-3">⏱️ Time <strong className="block">{briefing.seconds ?? 180} seconds</strong></li>
              <li className="glass-sm p-3">⭐ Best <strong className="block">{progress.stars[briefing.id] ? `${progress.stars[briefing.id]} stars · ${progress.best[briefing.id]}s` : 'Not cleared'}</strong></li>
            </ul>
            <p className="mt-4 text-sm text-[#9cddd2]">💡 {briefing.tip}</p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button type="button" className="btn" autoFocus onClick={() => start({ kind: 'mission', mission: briefing.id })}>Begin battle →</button>
              <button type="button" className="btn-secondary" onClick={() => setSelected(null)}>Not yet</button>
            </div>
          </div>
        </div>
      )}

      <section id="skirmish" className="scroll-mt-24" aria-labelledby="skirmish-heading">
        <p className="eyebrow">Practice anytime</p>
        <h2 id="skirmish-heading" className="mt-1 text-2xl font-bold">Quick battle vs the Machine</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-5">
          {SKIRMISH_LEVELS.map(level => (
            <button key={level.level} type="button" className="game-card !gap-1 !p-4 text-left" onClick={() => start({ kind: 'skirmish', level: level.level })}>
              <span aria-hidden="true" className="text-2xl">{['🪵', '🛡️', '⚔️', '🔥', '🤖'][level.level - 1]}</span>
              <strong>{level.label}</strong>
              <span className="text-xs text-white/65">{level.detail}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="glass p-5 sm:p-7" aria-labelledby="online-heading">
        <p className="eyebrow">Two players · live</p>
        <h2 id="online-heading" className="mt-1 text-2xl font-bold">Battle a friend or team up</h2>
        <p className="mt-2 text-white/70">Create a room, share the code, and fight on your own phones. Duel head-to-head, or stand side by side in co-op against a boosted Machine. Wins count on the global leaderboard.</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Link href="/rooms/new?game=fortress-feud" className="btn sm:!w-auto">Create a battle room →</Link>
          <Link href="/rooms/join" className="btn-secondary sm:!w-auto">Join with a code</Link>
        </div>
      </section>

      <section aria-labelledby="howto-heading">
        <h2 id="howto-heading" className="text-2xl font-bold">How to play</h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['💧', 'Elixir → troops', 'Elixir refills every two seconds. Pick a troop card, then tap a lane (or press 1–7, then A/S/D).'],
            ['🪙', 'Gold → fortress', 'Tap a glowing plot in front of your keep to build walls, towers and gold mines. Kills pay bounty.'],
            ['🛣️', 'Three lanes', 'Defenses only guard their own lane. Find the weak lane — and protect yours.'],
            ['⚡', 'Final minute', 'Elixir doubles for the last 60 seconds. Healthier keep wins at the buzzer.'],
          ].map(([emoji, title, text]) => <li key={title} className="glass-sm p-4"><span aria-hidden="true" className="text-2xl">{emoji}</span><h3 className="mt-2 font-bold">{title}</h3><p className="mt-1 text-sm text-white/70">{text}</p></li>)}
        </ol>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="font-bold">Troops & spells</h3>
            <ul className="mt-3 grid gap-2">{CARD_ORDER.map(id => { const card = CARDS[id]; return <li key={id} className="glass-sm flex items-center gap-3 p-3"><span aria-hidden="true" className="text-2xl">{card.emoji}</span><span className="min-w-0 flex-1"><strong>{card.name}</strong> <span className="text-sm text-white/65">· {card.blurb}</span></span><span className="shrink-0 rounded-full bg-fuchsia-500/20 px-2 py-1 text-xs font-black">💧 {card.cost}</span></li>; })}</ul>
          </div>
          <div>
            <h3 className="font-bold">Fortress buildings</h3>
            <ul className="mt-3 grid gap-2">{DEFENSE_ORDER.map(id => { const def = DEFENSES[id]; return <li key={id} className="glass-sm flex items-center gap-3 p-3"><span aria-hidden="true" className="text-2xl">{def.emoji}</span><span className="min-w-0 flex-1"><strong>{def.name}</strong> <span className="text-sm text-white/65">· {def.blurb}</span></span><span className="shrink-0 rounded-full bg-amber-400/20 px-2 py-1 text-xs font-black">🪙 {def.cost}</span></li>; })}</ul>
          </div>
        </div>
      </section>
    </div>
  );
}
