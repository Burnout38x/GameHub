'use client';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CARDS, CARD_ORDER, LANES, TICK_MS, type CardId } from '@/lib/fortress/content';
import type { CommandBody } from '@/lib/fortress/commands';
import BuildPanel from './BuildPanel';
import CardDock from './CardDock';
import { formatClock, type BattleDriver } from './driver';
import { drawBattle, effectsFromFx, laneAt, padAt, type Effect, type View } from './renderer';
import { BattleSound, readMuted, writeMuted } from './sound';
import type { Fx } from '@/lib/fortress/state';
import styles from './Fortress.module.css';

type Props = {
  driver: BattleDriver;
  myName: string;
  enemyName: string;
  quitLabel: string;
  onQuit: () => void;
  /** Rendered over the battlefield once the battle has an outcome. */
  endOverlay?: ReactNode;
  /** A short coaching tip shown at the start of the battle. */
  hint?: string;
};

const LANE_KEYS: Record<string, number> = { a: 0, arrowleft: 0, s: 1, arrowdown: 1, arrowup: 1, d: 2, arrowright: 2 };
const VIEW_LANES = ['◀ Left', 'Middle', 'Right ▶'];
const TOAST_MS = 1800;
const SHAKE_DECAY = 0.85;
const HINT_MS = 12000;

/** Which sound, if any, a simulation event makes. */
function soundFor(event: Fx) {
  if (event.k === 'build') return 'build' as const;
  if (event.k === 'boom') return event.size >= 2 ? 'bigBoom' as const : 'boom' as const;
  if (event.k === 'shot') return event.kind === 'meteor' ? 'meteor' as const : event.kind === 'melee' || event.kind === 'ball' ? 'hit' as const : null;
  return null;
}

export default function BattleArena({ driver, myName, enemyName, quitLabel, onQuit, endOverlay, hint }: Props) {
  const { hud, mySide, countdown, outcome, connection, paused, canPause, togglePause, send } = driver;
  const screenRef = useRef<HTMLDivElement>(null);
  const arenaRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef<View>({ width: 0, height: 0, mySide });
  const effectsRef = useRef<Effect[]>([]);
  const optionsRef = useRef({ armed: null as CardId | null, selectedPad: null as number | null, hoverLane: null as number | null, ghosts: driver.ghosts });
  const [armed, setArmed] = useState<CardId | null>(null);
  const [selectedPad, setSelectedPad] = useState<number | null>(null);
  const [toast, setToast] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [muted, setMuted] = useState(readMuted);
  const [showHint, setShowHint] = useState(!!hint);
  const soundRef = useRef<BattleSound | null>(null);
  const flipped = mySide === 1;

  useEffect(() => {
    const sound = new BattleSound();
    soundRef.current = sound;
    return () => sound.close();
  }, []);
  useEffect(() => { if (soundRef.current) soundRef.current.muted = muted; }, [muted]);
  useEffect(() => {
    if (!outcome) return;
    soundRef.current?.play(outcome.winner === mySide ? 'win' : 'lose');
  }, [outcome, mySide]);
  useEffect(() => {
    if (!showHint) return;
    const timer = setTimeout(() => setShowHint(false), HINT_MS);
    return () => clearTimeout(timer);
  }, [showHint]);

  useEffect(() => {
    optionsRef.current = { ...optionsRef.current, armed, selectedPad, ghosts: driver.ghosts };
  }, [armed, selectedPad, driver.ghosts]);

  // Full-screen battle: lock page scroll and take keyboard focus.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    screenRef.current?.focus();
    return () => { document.body.style.overflow = previous; };
  }, []);

  // Size the canvas to its box at device resolution.
  useEffect(() => {
    const arena = arenaRef.current;
    const canvas = canvasRef.current;
    if (!arena || !canvas) return;
    const resize = () => {
      const rect = arena.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      viewRef.current = { width: rect.width, height: rect.height, mySide };
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(arena);
    return () => observer.disconnect();
  }, [mySide]);

  // Render loop: draws the latest simulation state with smooth interpolation.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;
    let shake = 0;
    let lastKeepHp = -1;
    const draw = (now: number) => {
      const state = driver.stateRef.current;
      const view = viewRef.current;
      if (state && view.width > 0) {
        const fresh = driver.fxRef.current.splice(0);
        if (fresh.length) {
          effectsRef.current.push(...effectsFromFx(fresh, now));
          for (const event of fresh) { const kind = soundFor(event); if (kind) soundRef.current?.play(kind); }
        }
        effectsRef.current = effectsRef.current.filter(effect => now - effect.born < effect.life);
        const keepHp = state.keeps[mySide].hp;
        if (lastKeepHp >= 0 && keepHp < lastKeepHp) shake = Math.min(14, shake + 6);
        lastKeepHp = keepHp;
        shake *= SHAKE_DECAY;
        const options = optionsRef.current;
        const alpha = Math.max(0, Math.min(1, (performance.now() - driver.lastStepRef.current) / TICK_MS));
        drawBattle(ctx, state, view, effectsRef.current, {
          now, alpha, selectedPad: options.selectedPad, deployLane: options.hoverLane, armed: !!options.armed,
          ghosts: options.ghosts.filter(ghost => ghost.until > performance.now()), shake: shake > 0.5 ? shake : 0, reducedMotion,
        }, canvas.width / view.width);
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [driver.stateRef, driver.fxRef, driver.lastStepRef, mySide]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  // Spoken milestones for screen readers; the canvas itself is decorative.
  const enemyKeep = hud?.enemyKeep ?? 100;
  const myKeep = hud?.myKeep ?? 100;
  const enemyBand = Math.ceil(enemyKeep / 25);
  const myBand = Math.ceil(myKeep / 25);
  const announcement = myBand < 4 ? (myBand === 0 ? 'Your keep has fallen!' : `Your keep is below ${myBand * 25}%.`) : '';
  const enemyAnnouncement = enemyBand < 4 ? (enemyBand === 0 ? 'Enemy keep destroyed!' : `Enemy keep below ${enemyBand * 25}%.`) : '';

  const order = useCallback(async (body: CommandBody) => {
    const error = await send(body);
    if (error) setToast(error);
    else if (body.k === 'deploy') { setArmed(null); setShowHint(false); soundRef.current?.play('deploy'); navigator.vibrate?.(25); }
  }, [send]);

  const deployTo = useCallback((viewLane: number) => {
    if (!armed) return;
    const lane = flipped ? LANES - 1 - viewLane : viewLane;
    void order({ k: 'deploy', card: armed, lane });
  }, [armed, flipped, order]);

  function pointerPosition(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    const { x, y } = pointerPosition(event);
    const view = viewRef.current;
    if (armed) {
      void order({ k: 'deploy', card: armed, lane: laneAt(view, x) });
      return;
    }
    const pad = padAt(view, x, y);
    setSelectedPad(pad);
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (!armed) return;
    optionsRef.current.hoverLane = laneAt(viewRef.current, pointerPosition(event).x);
  }

  function arm(card: CardId | null) {
    setArmed(card);
    if (card) setSelectedPad(null);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).tagName === 'SELECT') return;
    const key = event.key.toLowerCase();
    // Orders pause while a dialog or the result card is open.
    if (menuOpen || outcome) { if (key === 'escape' && menuOpen) { setMenuOpen(false); event.preventDefault(); } return; }
    const index = Number(key) - 1;
    if (Number.isInteger(index) && index >= 0 && index < CARD_ORDER.length) { arm(armed === CARD_ORDER[index] ? null : CARD_ORDER[index]); event.preventDefault(); return; }
    if (armed && Object.hasOwn(LANE_KEYS, key)) { deployTo(LANE_KEYS[key]); event.preventDefault(); return; }
    if (key === 'escape') { if (armed || selectedPad !== null) { setArmed(null); setSelectedPad(null); } else setMenuOpen(open => !open); event.preventDefault(); return; }
    if (key === 'p' && canPause) { togglePause(); event.preventDefault(); }
  }

  const remaining = hud ? hud.endTick - hud.tick : 0;
  const selectedStructure = selectedPad !== null ? hud?.plots[selectedPad] ?? null : null;
  const status = connection === 'offline' ? '📡 Reconnecting…' : paused ? '⏸ Paused' : armed ? `Choose a lane for ${CARDS[armed].name}` : '';

  // Portalled to <body>: page transitions leave a transform that would trap a fixed screen.
  return createPortal(
    <div ref={screenRef} className={styles.screen} tabIndex={-1} onKeyDown={handleKeyDown} onPointerDownCapture={() => soundRef.current?.unlock()} onKeyDownCapture={() => soundRef.current?.unlock()} role="application" aria-label="Fortress Feud battle" aria-roledescription="game">
      <header className={styles.top}>
        <div className={styles.side}>
          <span className={styles.name}>🔴 {enemyName}</span>
          <div className={styles.bar} aria-hidden="true"><div className={`${styles.barFill} ${styles.enemy}`} style={{ width: `${enemyKeep}%` }} /></div>
          <span className={styles.barLabel}>Keep {enemyKeep}% · {hud?.enemyUnits ?? 0} troops</span>
        </div>
        <div className={styles.clock} role="timer" aria-label={`${formatClock(remaining)} left`}>
          <span className={styles.clockTime}>{formatClock(remaining)}</span>
          <span className={`${styles.clockNote} ${hud?.overdrive ? styles.overdrive : ''}`}>{hud?.overdrive ? '⚡ 2× elixir' : 'Time left'}</span>
        </div>
        <div className={`${styles.side} ${styles.sideRight}`}>
          <div className="flex items-center gap-2">
            <span className={styles.name}>🔵 {myName}</span>
            <button type="button" className={styles.iconButton} onClick={() => { const next = !muted; setMuted(next); writeMuted(next); }} aria-label={muted ? 'Turn sound on' : 'Mute sound'} aria-pressed={muted}>{muted ? '🔇' : '🔊'}</button>
            <button type="button" className={styles.iconButton} onClick={() => setMenuOpen(true)} aria-label="Battle menu">⋯</button>
          </div>
          <div className={styles.bar} aria-hidden="true"><div className={`${styles.barFill} ${styles.ally}`} style={{ width: `${myKeep}%` }} /></div>
          <span className={styles.barLabel}>Keep {myKeep}% · {hud?.myUnits ?? 0} troops</span>
        </div>
      </header>

      <div className={styles.arenaWrap}>
        <div ref={arenaRef} className={styles.arena}>
          <canvas
            ref={canvasRef}
            className={styles.canvas}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerLeave={() => { optionsRef.current.hoverLane = null; }}
            role="img"
            aria-label={`Battlefield. Your keep ${myKeep}%, enemy keep ${enemyKeep}%. ${hud?.myUnits ?? 0} of your troops and ${hud?.enemyUnits ?? 0} enemy troops on the field.`}
          />
          {status && <div className={styles.status} role="status">{status}</div>}
          {armed && !outcome && (
            <div className={styles.laneButtons} role="group" aria-label="Deploy lane">
              {VIEW_LANES.map((label, viewLane) => <button key={label} type="button" className={styles.laneButton} onClick={() => deployTo(viewLane)}>{label}</button>)}
            </div>
          )}
          {toast && <div className={styles.toast} role="alert">{toast}</div>}
          {showHint && hint && !outcome && countdown === 0 && <button type="button" className={styles.hint} onClick={() => setShowHint(false)} aria-label={`Tip: ${hint}. Dismiss`}>💡 {hint}</button>}
          {countdown > 0 && !outcome && <div className={styles.overlay} aria-live="assertive"><span key={countdown} className={styles.countdown}>{countdown}</span></div>}
          {paused && !outcome && <div className={styles.overlay}><div className={`${styles.banner} pointer-events-auto flex flex-col items-center gap-3`}><span>Battle paused</span><button type="button" className="btn !min-h-11 !w-auto !px-6" onClick={togglePause}>▶ Resume</button></div></div>}
          {outcome && endOverlay}
        </div>
      </div>

      <BuildPanel pad={selectedPad} structure={selectedStructure} gold={hud?.gold ?? 0} flipped={flipped} onOrder={body => void order(body)} onSelectPad={pad => { setSelectedPad(pad); if (pad !== null) setArmed(null); }} occupied={(hud?.plots ?? []).map(Boolean)} />
      <CardDock hud={hud} armed={armed} onArm={arm} />

      <p className="sr-only" aria-live="polite">{enemyAnnouncement}</p>
      <p className="sr-only" aria-live="polite">{announcement}</p>

      {menuOpen && (
        <div className={styles.menu} role="dialog" aria-modal="true" aria-labelledby="battle-menu-title">
          <div className={styles.menuCard}>
            <h2 id="battle-menu-title" className="text-xl font-black">Battle menu</h2>
            <p className="text-sm text-white/70">Tap a troop then a lane (or keys 1–7, then A/S/D). Tap a glowing plot in front of your keep to build with gold.</p>
            {canPause && <button type="button" className="btn" onClick={() => { togglePause(); setMenuOpen(false); }}>{paused ? '▶ Resume' : '⏸ Pause'}</button>}
            <button type="button" className="btn-secondary" onClick={() => setMenuOpen(false)} autoFocus>Back to battle</button>
            <button type="button" className="btn-danger" onClick={onQuit}>{quitLabel}</button>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
