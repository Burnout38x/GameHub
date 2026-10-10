'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AMMO, AMMO_ORDER, BUILD_MATERIALS, MATERIALS, START_GOLD } from '@/lib/fortress/content';
import { DEFAULT_DESIGN, parseDesign, type FortressDesign } from '@/lib/fortress/design';
import { MISSIONS, SKIRMISH_LEVELS } from '@/lib/fortress/missions';
import { CAMPAIGN_STORAGE_KEY, MAX_STARS, campaignRank, mergeProgress, missionUnlocked, parseProgress, totalStars, type CampaignProgress } from '@/lib/fortress/campaign';
import { setupRules, type MatchSetup } from '@/lib/fortress/match';
import BuildScreen from './BuildScreen';
import LocalSiege, { enemyLabel, type LocalResult } from './LocalSiege';
import hub from './FortressHub.module.css';

type View =
  | { phase: 'hub' }
  | { phase: 'build'; setup: MatchSetup }
  | { phase: 'battle'; setup: MatchSetup; design: FortressDesign; seed: number; key: number };
const EMPTY: CampaignProgress = { stars: {}, best: {} };
const DESIGN_KEY = 'gamehub:fortress-feud:design:v2';
const newSeed = () => Math.floor(Math.random() * 2_000_000_000) + 1;

function readLocal(): CampaignProgress {
  try { return parseProgress(JSON.parse(localStorage.getItem(CAMPAIGN_STORAGE_KEY) ?? 'null')); } catch { return EMPTY; }
}
function writeLocal(progress: CampaignProgress) {
  try { localStorage.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify(progress)); } catch { /* Private mode: progress lasts for this visit. */ }
}
function readDesign(): FortressDesign {
  try { return parseDesign(JSON.parse(localStorage.getItem(DESIGN_KEY) ?? 'null'), Infinity) ?? DEFAULT_DESIGN; } catch { return DEFAULT_DESIGN; }
}
function writeDesign(design: FortressDesign) {
  try { localStorage.setItem(DESIGN_KEY, JSON.stringify(design)); } catch { /* Storage blocked: the design lasts for this visit. */ }
}

export default function FortressFeud() {
  const [progress, setProgress] = useState<CampaignProgress>(EMPTY);
  const [synced, setSynced] = useState<'unknown' | 'signed-in' | 'guest'>('unknown');
  const [selected, setSelected] = useState<number | null>(null);
  const [view, setView] = useState<View>({ phase: 'hub' });

  useEffect(() => {
    let active = true;
    const local = readLocal();
    fetch('/api/fortress-feud', { cache: 'no-store' })
      .then(async response => {
        if (!active) return;
        if (response.status === 401) { setSynced('guest'); setProgress(local); return; }
        const data = await response.json();
        const remote: Record<string, Record<number, number>> = { stars: {}, best: {} };
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

  const build = useCallback((setup: MatchSetup) => {
    setSelected(null);
    setView({ phase: 'build', setup });
    window.scrollTo({ top: 0 });
  }, []);

  const recordResult = useCallback((result: LocalResult) => {
    if (result.mission === null || !result.won) return;
    const id = result.mission;
    const next = mergeProgress(readLocal(), { stars: { [id]: result.stars }, best: { [id]: result.shots } });
    writeLocal(next);
    setProgress(previous => mergeProgress(previous, next));
  }, []);

  const exit = useCallback(() => setView({ phase: 'hub' }), []);
  const retry = useCallback(() => setView(current => current.phase === 'battle' ? { ...current, seed: newSeed(), key: Date.now() } : current), []);
  const rebuild = useCallback(() => setView(current => current.phase === 'battle' ? { phase: 'build', setup: current.setup } : current), []);
  const nextAfter = useMemo(() => {
    if (view.phase !== 'battle' || view.setup.kind !== 'mission') return null;
    const id = view.setup.mission;
    return id >= MISSIONS.length ? null : () => build({ kind: 'mission', mission: id + 1 });
  }, [view, build]);

  if (view.phase === 'battle') {
    return <LocalSiege key={view.key} setup={view.setup} design={view.design} seed={view.seed} onResult={recordResult} onExit={exit} onRetry={retry} onRebuild={rebuild} onNext={nextAfter} />;
  }

  if (view.phase === 'build') {
    const rules = setupRules(view.setup, 1);
    const mission = view.setup.kind === 'mission' ? MISSIONS.find(entry => entry.id === (view.setup as { mission: number }).mission) : null;
    return (
      <BuildScreen
        title={`Fortify for ${enemyLabel(view.setup)}`}
        budget={rules.gold}
        initial={readDesign()}
        confirmLabel="⚔️ To battle!"
        onConfirm={design => { writeDesign(design); setView({ phase: 'battle', setup: view.setup, design, seed: newSeed(), key: Date.now() }); }}
        onBack={exit}
        backLabel="Back to the war room"
        note={mission && <p className="glass-sm p-3 text-sm text-[#9cddd2]">💡 {mission.tip}</p>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <section className={hub.hero} aria-labelledby="fortress-title">
        <div className={hub.scene} aria-hidden="true">
          <span className={hub.castleLeft}>🏰</span>
          <span className={hub.river} />
          <span className={hub.castleRight}>🏯</span>
          <span className={hub.shot}>🪨</span>
          <span className={`${hub.shot} ${hub.shotBack}`}>💣</span>
        </div>
        <div className={hub.heroCopy}>
          <p className="eyebrow">Physics siege · drag, aim, launch</p>
          <h1 id="fortress-title" className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">Fortress Feud</h1>
          <p className="mt-3 max-w-xl text-white/75">Spend <strong className="text-[#fde68a]">gold</strong> on timber, stone or steel to build your fortress, then pull back your trebuchet and smash theirs. Blocks crack, topple and burn for real. Knock out the enemy <strong>King and Knights</strong> to win — <strong className="text-[#f0abfc]">elixir</strong> builds each turn for devastating Barrages and Titan Boulders.</p>
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
        {synced === 'guest' && <p className="glass-sm mb-4 p-3 text-sm text-white/70">Playing as a guest: stars are kept on this device. <Link href="/login?next=/play/fortress-feud" className="font-bold text-[#9cddd2] underline">Sign in</Link> to save victories to your profile and the leaderboard.</p>}
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
              <li className="glass-sm p-3">🤖 Gunner <strong className="block">{SKIRMISH_LEVELS[briefing.aiLevel - 1].label}</strong></li>
              <li className="glass-sm p-3">🌬️ Wind <strong className="block">{briefing.windMax === 0 ? 'Calm' : briefing.windMax >= 2.2 ? 'Gale' : briefing.windMax >= 1.2 ? 'Breezy' : 'Light'}</strong></li>
              <li className="glass-sm p-3">🪙 War chest <strong className="block">{briefing.gold ?? START_GOLD} gold</strong></li>
              <li className="glass-sm p-3">⭐ Best <strong className="block">{progress.stars[briefing.id] ? `${progress.stars[briefing.id]} stars${progress.best[briefing.id] ? ` · ${progress.best[briefing.id]} shots` : ''}` : 'Not cleared'}</strong></li>
            </ul>
            <p className="mt-4 text-sm text-[#9cddd2]">💡 {briefing.tip}</p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button type="button" className="btn" autoFocus onClick={() => build({ kind: 'mission', mission: briefing.id })}>Build my fortress →</button>
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
            <button key={level.level} type="button" className="game-card !gap-1 !p-4 text-left" onClick={() => build({ kind: 'skirmish', level: level.level })}>
              <span aria-hidden="true" className="text-2xl">{['🪵', '🛡️', '⚔️', '🔥', '🤖'][level.level - 1]}</span>
              <strong>{level.label}</strong>
              <span className="text-xs text-white/65">{level.detail}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="glass p-5 sm:p-7" aria-labelledby="online-heading">
        <p className="eyebrow">Two players · turn by turn</p>
        <h2 id="online-heading" className="mt-1 text-2xl font-bold">Battle a friend or team up</h2>
        <p className="mt-2 text-white/70">Create a room and share the code. Each of you builds a fortress on your own phone, then you trade shots — both screens replay every hit. In co-op you share one fortress and take turns against a sharp-eyed Machine. Wins count on the global leaderboard.</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Link href="/rooms/new?game=fortress-feud" className="btn sm:!w-auto">Create a battle room →</Link>
          <Link href="/rooms/join" className="btn-secondary sm:!w-auto">Join with a code</Link>
        </div>
      </section>

      <section aria-labelledby="howto-heading">
        <h2 id="howto-heading" className="text-2xl font-bold">How to play</h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['🏗️', 'Build', 'Place posts, floors, walls, roofs and windows block by block — or start from a template. Stress-test it, then hide your King and Knights inside.'],
            ['🎯', 'Aim', 'Drag back anywhere on the field — the dots show your launch — then let go. Or use the sliders.'],
            ['🌬️', 'Read the wind', 'The flags and clouds show the wind. It bends long, high shots the most.'],
            ['👑', 'Win', 'Knock out the King and both Knights. Out of shots? The fortress with more standing wins.'],
          ].map(([emoji, title, text]) => <li key={title} className="glass-sm p-4"><span aria-hidden="true" className="text-2xl">{emoji}</span><h3 className="mt-2 font-bold">{title}</h3><p className="mt-1 text-sm text-white/70">{text}</p></li>)}
        </ol>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="font-bold">Ammunition</h3>
            <ul className="mt-3 grid gap-2">{AMMO_ORDER.map(id => { const item = AMMO[id]; return <li key={id} className="glass-sm flex items-center gap-3 p-3"><span aria-hidden="true" className="text-2xl">{item.emoji}</span><span className="min-w-0 flex-1"><strong>{item.name}</strong> <span className="text-sm text-white/65">· {item.blurb}</span></span><span className={`shrink-0 rounded-full px-2 py-1 text-xs font-black ${item.elixir ? 'bg-fuchsia-500/20' : 'bg-amber-400/20'}`}>{item.elixir ? `💧 ${item.elixir}` : item.gold ? `🪙 ${item.gold}` : 'Free'}</span></li>; })}</ul>
          </div>
          <div>
            <h3 className="font-bold">Building materials</h3>
            <ul className="mt-3 grid gap-2">{BUILD_MATERIALS.map(id => { const material = MATERIALS[id]; return <li key={id} className="glass-sm flex items-center gap-3 p-3"><span aria-hidden="true" className="text-2xl">{{ wood: '🪵', stone: '🧱', steel: '⛓️', glass: '🪟' }[id]}</span><span className="min-w-0 flex-1"><strong>{material.name}</strong> <span className="text-sm text-white/65">· {id === 'wood' ? 'Light and cheap, but it splinters and burns.' : id === 'stone' ? 'Heavy and solid. Shrugs off small hits.' : 'Nearly unbreakable. Expensive.'}</span></span><span className="shrink-0 rounded-full bg-amber-400/20 px-2 py-1 text-xs font-black">🪙 {material.costPerArea}/m²</span></li>; })}</ul>
            <p className="mt-3 text-sm text-white/65">Each turn you earn 🪙 30 plus a cut of the damage you deal, and 🪙 80 for every royal you knock out. 🩹 Patch up (🪙 100) heals your royals and puts out fires.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
