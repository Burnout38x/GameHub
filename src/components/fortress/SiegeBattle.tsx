'use client';
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AMMO, MAX_ANGLE, MIN_ANGLE, REPAIR_COST, type AmmoId } from '@/lib/fortress/content';
import { activePlayer, activePlayerIndex, canAfford, type MatchAction, type MatchState } from '@/lib/fortress/match';
import type { Replay } from '@/lib/fortress/physics';
import type { Side } from '@/lib/fortress/world';
import { Stage, type CameraMode, type SoundCue, type SoundMaterial } from './scene/stage';
import type { Theme } from './scene/art';
import { BattleSound, readMuted, writeMuted, type SoundKind } from './sound';
import { AmmoTray, SideCard, WindGauge, describeShot } from './SiegeHud';
import s from './Siege.module.css';

export interface SiegePlayback { key: number; replay: Replay; after: MatchState; side: Side }

interface Props {
  match: MatchState;
  playback: SiegePlayback | null;
  onPlaybackDone: (key: number) => void;
  /** Player indexes this device fires for. */
  mine: number[];
  viewSide: Side;
  sideNames: [string, string];
  theme: Theme;
  /** What the room is waiting on when it is not this device's turn. */
  waiting: string | null;
  deadline?: number | null;
  clockOffset?: number;
  busy: boolean;
  /** Skip the shot on screen to its end (a newer one is waiting). */
  rush?: boolean;
  error: string | null;
  onAction: (action: MatchAction) => void;
  onQuit: () => void;
  quitLabel: string;
  overlay?: ReactNode;
}

const SOUNDS: Record<SoundCue, SoundKind> = { launch: 'launch', hit: 'thud', boom: 'boom', break: 'thud', ko: 'ko', split: 'split', splash: 'splash', thud: 'thud', thunder: 'thunder' };
/** Impacts are voiced by what was hit. */
const soundFor = (cue: SoundCue, material: SoundMaterial): SoundKind => ((cue === 'hit' || cue === 'break') && material ? material : SOUNDS[cue]);
const WHEEL_STEP = 1.12;
const GUIDE_SECONDS = 0.9;
const MIN_PULL_PX = 14;

/** Full-screen siege: drag back on the field to aim, let go to launch. */
export default function SiegeBattle(props: Props) {
  // Battles only open after client-side interaction, so the document is always there.
  // Portalled to <body>: the page-enter animation transforms <main>, which would trap position: fixed.
  return createPortal(<SiegeScreen {...props} />, document.body);
}

function SiegeScreen({ match, playback, onPlaybackDone, mine, viewSide, sideNames, theme, waiting, deadline, clockOffset = 0, busy, rush = false, error, onAction, onQuit, quitLabel, overlay }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<Stage | null>(null);
  const soundRef = useRef<BattleSound | null>(null);
  const dragRef = useRef<{ x: number; y: number; id: number } | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<number | null>(null);
  const [angle, setAngle] = useState(45);
  const [power, setPower] = useState(0.62);
  const [ammo, setAmmo] = useState<AmmoId>('stone');
  const [camera, setCamera] = useState<CameraMode>('auto');
  const [muted, setMuted] = useState(readMuted);
  const [pulling, setPulling] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const turnIndex = activePlayerIndex(match);
  const shooter = activePlayer(match);
  const myTurn = !match.result && !playback && mine.includes(turnIndex);
  const canAct = myTurn && !busy;
  const pick = canAfford(shooter, ammo) ? ammo : 'stone';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const stage = new Stage(canvas, theme);
    const sound = new BattleSound();
    sound.muted = readMuted();
    stage.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    stage.onSound = (cue, strength, material) => sound.play(soundFor(cue, material), strength);
    stageRef.current = stage;
    soundRef.current = sound;
    return () => { stage.destroy(); sound.close(); stageRef.current = null; soundRef.current = null; };
  }, [theme]);

  useEffect(() => { stageRef.current?.setWorld(match.world, match.wind); }, [match]);
  useEffect(() => { if (stageRef.current) stageRef.current.focusSide = viewSide; }, [viewSide]);
  useEffect(() => { if (stageRef.current) stageRef.current.mode = camera; }, [camera]);
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.aim = canAct ? { side: shooter.side, angle, power, wind: match.wind, ammo: pick, seconds: GUIDE_SECONDS } : null;
    stage.setLoaded(shooter.side, pick);
  }, [canAct, shooter.side, angle, power, match.wind, pick]);

  // Replays are keyed by shot: a parent re-render with a fresh object must not restart one.
  const playbackRef = useRef(playback);
  const doneRef = useRef(onPlaybackDone);
  useEffect(() => { playbackRef.current = playback; doneRef.current = onPlaybackDone; });
  const playKey = playback?.key ?? null;
  useEffect(() => {
    const current = playbackRef.current;
    if (playKey === null || !current) return;
    const stage = stageRef.current;
    if (!stage) { doneRef.current(playKey); return; }
    let live = true;
    void stage.play(current.replay, current.after.world, current.side).then(() => { if (live) doneRef.current(playKey); });
    return () => { live = false; };
  }, [playKey]);

  useEffect(() => { if (rush) stageRef.current?.skip(); }, [rush, playKey]);

  // A fanfare or a dirge when the dust settles on the last shot.
  const outcome = playback ? null : match.result;
  useEffect(() => {
    if (!outcome) return;
    const mySide = match.players[mine[0]]?.side;
    soundRef.current?.play(outcome.winner === null ? 'thud' : outcome.winner === mySide ? 'win' : 'lose');
  }, [outcome]); // eslint-disable-line react-hooks/exhaustive-deps -- play once per result

  // Mouse wheel zooms the battlefield; the listener must be non-passive to stop page scroll.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      stageRef.current?.zoomBy(event.deltaY > 0 ? WHEEL_STEP : 1 / WHEEL_STEP);
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => {
    if (!deadline) return;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [deadline]);

  const fire = () => {
    if (!canAct) return;
    soundRef.current?.unlock();
    onAction({ type: 'fire', angle, power, ammo: pick });
  };

  const aimFrom = (event: PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag) return null;
    const dx = (drag.x - event.clientX) * (shooter.side === 0 ? 1 : -1);
    const dy = event.clientY - drag.y;
    const distance = Math.hypot(dx, dy);
    const rect = event.currentTarget.getBoundingClientRect();
    const full = Math.max(120, Math.min(rect.width, rect.height) * 0.45);
    const nextAngle = Math.round(Math.min(MAX_ANGLE, Math.max(MIN_ANGLE, (Math.atan2(dy, dx) * 180) / Math.PI)));
    return { angle: nextAngle, power: Math.round(Math.min(1, distance / full) * 100) / 100, distance };
  };

  const pinchDistance = () => {
    const [a, b] = [...pointersRef.current.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : null;
  };
  const endDrag = () => {
    dragRef.current = null;
    if (stageRef.current) stageRef.current.drag = null;
    setPulling(false);
  };

  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    // A second finger turns the gesture into a pinch-zoom and cancels any pull.
    if (pointersRef.current.size === 2) { endDrag(); pinchRef.current = pinchDistance(); return; }
    if (!canAct || event.button > 0) return;
    soundRef.current?.unlock();
    // Capture keeps the drag alive off the canvas; aiming still works if a browser refuses it.
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Capture is optional. */ }
    dragRef.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
    setPulling(true);
  };
  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (pointersRef.current.has(event.pointerId)) pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size === 2 && pinchRef.current) {
      const distance = pinchDistance();
      if (distance) { stageRef.current?.zoomBy(pinchRef.current / distance); pinchRef.current = distance; }
      return;
    }
    const aim = aimFrom(event);
    if (!aim || aim.distance < MIN_PULL_PX) return;
    setAngle(aim.angle);
    setPower(aim.power);
    const rect = event.currentTarget.getBoundingClientRect();
    const drag = dragRef.current;
    if (stageRef.current && drag) stageRef.current.drag = { ax: drag.x - rect.left, ay: drag.y - rect.top, px: event.clientX - rect.left, py: event.clientY - rect.top, power: aim.power };
  };
  const onPointerUp = (event: PointerEvent<HTMLCanvasElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    const aim = aimFrom(event);
    const own = dragRef.current?.id === event.pointerId;
    endDrag();
    if (!own || !aim || aim.distance < MIN_PULL_PX || !canAct) return;
    onAction({ type: 'fire', angle: aim.angle, power: aim.power, ammo: pick });
  };
  const onPointerCancel = (event: PointerEvent<HTMLCanvasElement>) => {
    pointersRef.current.delete(event.pointerId);
    pinchRef.current = null;
    endDrag();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    const big = event.shiftKey;
    const keys: Record<string, () => void> = {
      ArrowUp: () => setAngle(value => Math.min(MAX_ANGLE, value + (big ? 5 : 1))),
      ArrowDown: () => setAngle(value => Math.max(MIN_ANGLE, value - (big ? 5 : 1))),
      ArrowRight: () => setPower(value => Math.min(1, Math.round((value + (big ? 0.05 : 0.01)) * 100) / 100)),
      ArrowLeft: () => setPower(value => Math.max(0, Math.round((value - (big ? 0.05 : 0.01)) * 100) / 100)),
      Enter: fire,
      ' ': fire,
      o: () => setCamera(mode => (mode === 'overview' ? 'auto' : 'overview')),
    };
    const ammoKey = Number(event.key);
    if (Number.isInteger(ammoKey) && ammoKey >= 1 && ammoKey <= 8) {
      const id = (Object.keys(AMMO) as AmmoId[])[ammoKey - 1];
      if (canAfford(shooter, id)) setAmmo(id);
      event.preventDefault();
      return;
    }
    const action = keys[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    writeMuted(next);
    if (soundRef.current) soundRef.current.muted = next;
  };

  const secondsLeft = deadline ? Math.max(0, Math.ceil((deadline - (now + clockOffset)) / 1000)) : null;
  const status = playback ? (playback.side === viewSide ? 'Shot away…' : 'Incoming!')
    : match.result ? 'Battle over'
      : myTurn ? (busy ? 'Launching…' : pulling ? 'Let go to launch · drag back to cancel' : 'Your turn — drag back on the field to aim')
        : waiting ?? `${shooter.name} is aiming…`;
  const turnLabel = match.result ? 'Final' : mine.includes(turnIndex) ? (mine.length > 1 ? `${shooter.name}’s turn` : 'Your turn') : `${shooter.name}`;
  const last = !playback && match.last ? describeShot(match, match.last) : null;

  return (
    <div className={s.screen} role="application" aria-label="Fortress Feud siege">
      <header className={s.top}>
        <SideCard match={match} side={0} label={sideNames[0]} align="left" />
        <div className={s.center}>
          <span className={s.turn}>{turnLabel}</span>
          <WindGauge wind={match.wind} />
          {secondsLeft !== null && !match.result && <span className={`${s.timer} ${secondsLeft <= 10 ? s.timerLow : ''}`} aria-live="off">⏱ {secondsLeft}s</span>}
        </div>
        <SideCard match={match} side={1} label={sideNames[1]} align="right" />
      </header>

      <div className={s.field} tabIndex={0} onKeyDown={onKeyDown} aria-label="Battlefield. Arrow keys: up and down for angle, left and right for power. Enter launches. Keys 1 to 8 pick ammunition.">
        <canvas
          ref={canvasRef}
          className={`${s.canvas} ${canAct ? '' : s.canvasIdle}`}
          role="img"
          aria-label={`Battlefield. ${sideNames[0]} on the left, ${sideNames[1]} on the right.`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
        />
        <p className={s.status} role="status">{status}</p>
        <div className={s.tools}>
          <button type="button" className={s.camButton} onClick={toggleMute} aria-pressed={muted} aria-label={muted ? 'Turn sound on' : 'Turn sound off'}>{muted ? '🔇' : '🔊'}</button>
          <button type="button" className={s.camButton} onClick={onQuit} aria-label={quitLabel}>🏳️</button>
        </div>
        <div className={s.cams}>
          {playback
            ? <button type="button" className={s.camButton} onClick={() => stageRef.current?.skip()} aria-label="Skip to the result">⏩</button>
            : null}
          <button type="button" className={s.camButton} onClick={() => stageRef.current?.zoomBy(1 / 1.25)} aria-label="Zoom in">＋</button>
          <button type="button" className={s.camButton} onClick={() => stageRef.current?.zoomBy(1.25)} aria-label="Zoom out">－</button>
          {playback
            ? null
            : ([['overview', '🔭', 'Whole battlefield'], ['home', '🏰', 'Your fortress'], ['enemy', '🎯', 'Enemy fortress']] as const).map(([mode, icon, label]) => (
              <button key={mode} type="button" className={s.camButton} aria-pressed={camera === mode} aria-label={label} onClick={() => setCamera(current => (current === mode ? 'auto' : mode))}>{icon}</button>
            ))}
        </div>
        {canAct && <div className={`${s.pull} ${viewSide === 0 ? s.pullFar : ''}`} aria-hidden="true"><span>📐 {angle}°</span><span>💪 {Math.round(power * 100)}%</span></div>}
        {error ? <p key={error} className={`${s.toast} ${s.error}`} role="alert">{error}</p>
          : last && <p key={match.turn} className={s.toast} aria-live="polite">{last}</p>}
      </div>

      <section className={s.panel} aria-label="War table">
        <div className={s.group}>
          <AmmoTray ammo={pick} onPick={setAmmo} afford={id => canAfford(shooter, id)} disabled={!canAct} />
          <p className={s.blurb}><strong>{AMMO[pick].emoji} {AMMO[pick].name}</strong> — {AMMO[pick].blurb}</p>
        </div>
        <div className={s.group}>
          <div className={s.sliders}>
            <label className={s.slider}>
              <span>Angle <b>{angle}°</b></span>
              <input type="range" min={MIN_ANGLE} max={MAX_ANGLE} value={angle} disabled={!canAct} onChange={event => setAngle(Number(event.target.value))} />
            </label>
            <label className={s.slider}>
              <span>Power <b>{Math.round(power * 100)}%</b></span>
              <input type="range" min={0} max={100} value={Math.round(power * 100)} disabled={!canAct} onChange={event => setPower(Number(event.target.value) / 100)} />
            </label>
          </div>
          <div className={s.actions}>
            <button type="button" className={s.fire} disabled={!canAct} onClick={fire}>🚀 Launch</button>
            <button
              type="button"
              className={s.repair}
              disabled={!canAct || shooter.repaired || shooter.gold < REPAIR_COST}
              onClick={() => onAction({ type: 'repair' })}
              title="Heal every royal by 30 and put out fires"
            >🩹 Patch up · 🪙{REPAIR_COST}</button>
          </div>
          <p className={s.small}>Drag back anywhere on the field and let go to launch. Wind bends long shots. Gold pays for ammo; elixir builds up by one each turn for Barrage and Titan.</p>
        </div>
      </section>
      {overlay}
    </div>
  );
}
