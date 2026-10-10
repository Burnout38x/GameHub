'use client';
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { BUILD_MATERIALS, FORT_OFFSET, MATERIALS, PLATEAU_Y, ROYALS, type MaterialId, type RoyalRole } from '@/lib/fortress/content';
import {
  BUILD_HEIGHT, GRID, MAX_PIECES, PIECES, PIECE_ORDER, ROYAL_SET, TEMPLATES, TEMPLATE_ORDER, allowedMaterials, clampX, designCost, designHp, designProblem,
  dropPiece, layoutProblem, dropRoyal, pieceBox, pieceCost, royalBox, templateDesign, type FortressDesign, type PieceKind, type TemplateId,
} from '@/lib/fortress/design';
import { simulateShot } from '@/lib/fortress/physics';
import { createWorld } from '@/lib/fortress/world';
import { Stage, type Ghost } from './scene/stage';
import s from './Build.module.css';

type Tool = { type: 'piece'; kind: PieceKind } | { type: 'royal'; role: RoyalRole } | null;
type Selection = { type: 'piece' | 'royal'; index: number } | null;
type Scheme = 'timber' | 'mixed' | 'stone' | 'steel';
const SCHEMES: Record<Scheme, { label: string; frame: MaterialId; floors: MaterialId; walls: MaterialId }> = {
  timber: { label: 'All timber', frame: 'wood', floors: 'wood', walls: 'wood' },
  mixed: { label: 'Timber + stone walls', frame: 'wood', floors: 'wood', walls: 'stone' },
  stone: { label: 'All stone', frame: 'stone', floors: 'stone', walls: 'stone' },
  steel: { label: 'Stone + steel walls', frame: 'stone', floors: 'stone', walls: 'steel' },
};
const SWATCH: Record<MaterialId, string> = { wood: '#b07a45', stone: '#9a958b', steel: '#8c99a7', glass: '#8fd0f5' };
const MATERIAL_ICON: Record<MaterialId, string> = { wood: '🪵', stone: '🧱', steel: '⛓️', glass: '🪟' };
const ROYAL_ICON: Record<RoyalRole, string> = { king: '👑', knight: '🛡️' };
const HISTORY_LIMIT = 60;
const STABLE_DRIFT = 0.35;

interface Props {
  title: string;
  budget: number;
  initial: FortressDesign;
  confirmLabel: string;
  onConfirm: (design: FortressDesign) => void;
  onBack?: () => void;
  backLabel?: string;
  busy?: boolean;
  note?: ReactNode;
}

/** A small to-scale drawing of a piece for the palette. */
function PieceIcon({ kind, material }: { kind: PieceKind; material: MaterialId }) {
  const spec = PIECES[kind];
  const scale = 30 / Math.max(spec.w, spec.h);
  const w = spec.w * scale;
  const h = spec.h * scale;
  const x = 20 - w / 2;
  const y = 36 - h;
  const fill = SWATCH[spec.glass ? 'glass' : material];
  return (
    <svg viewBox="0 0 40 40" className={s.pieceIcon} aria-hidden="true">
      {spec.shape === 'tri'
        ? <polygon points={`${x},${y + h} ${x + w},${y + h} ${20},${y}`} fill={fill} stroke="#1c140c" strokeWidth="1.5" />
        : <rect x={x} y={y} width={w} height={h} fill={fill} stroke="#1c140c" strokeWidth="1.5" rx="1" />}
    </svg>
  );
}

/** Build a fortress piece by piece on your plot. Gold not spent here buys ammunition. */
export default function BuildScreen({ title, budget, initial, confirmLabel, onConfirm, onBack, backLabel = 'Back', busy = false, note }: Props) {
  const [design, setDesign] = useState<FortressDesign>(initial);
  const [history, setHistory] = useState<FortressDesign[]>([]);
  const [tool, setTool] = useState<Tool>(null);
  const [material, setMaterial] = useState<MaterialId>('wood');
  const [selection, setSelection] = useState<Selection>(null);
  const [scheme, setScheme] = useState<Scheme>('mixed');
  const [ghostX, setGhostX] = useState<number | null>(null);
  const [testing, setTesting] = useState<'running' | { moved: number; fallen: number } | null>(null);
  const [tab, setTab] = useState<'pieces' | 'royals' | 'templates'>('pieces');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<Stage | null>(null);
  const dragRef = useRef<{ id: number; moved: boolean } | null>(null);

  const cost = designCost(design);
  const problem = designProblem(design, budget);
  const royalsPlaced = (role: RoyalRole) => design.royals.filter(royal => royal.role === role).length;

  // The stress test replays on the plot; edits wait until it finishes so the result matches the design.
  const locked = testing === 'running';
  const commit = useCallback((next: FortressDesign) => {
    if (locked) return;
    setHistory(previous => [...previous.slice(-HISTORY_LIMIT + 1), design]);
    setDesign(next);
    setTesting(null);
  }, [design, locked]);

  const undo = () => {
    const previous = history[history.length - 1];
    if (!previous || locked) return;
    setHistory(history.slice(0, -1));
    setDesign(previous);
    setSelection(null);
    setTesting(null);
  };

  // Where the current tool (or the selected item being moved) would land.
  const ghost = useMemo<(Ghost & { local: FortressDesign }) | null>(() => {
    if (ghostX === null) return null;
    const moving = !tool && selection;
    // Undo or Clear can remove the selected item out from under a move.
    if (moving && !(selection.type === 'piece' ? design.pieces : design.royals)[selection.index]) return null;
    if (tool?.type === 'piece' || (moving && selection.type === 'piece')) {
      const kind = tool?.type === 'piece' ? tool.kind : design.pieces[selection!.index].kind;
      const pieceMaterial = tool?.type === 'piece' ? (allowedMaterials(kind).includes(material) ? material : allowedMaterials(kind)[0]) : design.pieces[selection!.index].material;
      const ignore = moving ? selection!.index : -1;
      const x = clampX(ghostX, PIECES[kind].w);
      const y = dropPiece(design, kind, x, ignore);
      const pieces = moving ? design.pieces.map((piece, index) => index === ignore ? { ...piece, x, y } : piece) : [...design.pieces, { kind, material: pieceMaterial, x, y }];
      const local = { ...design, pieces };
      const valid = pieceBox({ kind, x, y }).y1 <= BUILD_HEIGHT && pieces.length <= MAX_PIECES && designCost(local) <= budget && !layoutProblem(local);
      return { type: 'piece', piece: kind, material: pieceMaterial, x, y, valid, local };
    }
    if (tool?.type === 'royal' || (moving && selection.type === 'royal')) {
      const role = tool?.type === 'royal' ? tool.role : design.royals[selection!.index].role;
      const ignore = moving ? selection!.index : -1;
      const x = clampX(ghostX, ROYALS[role].radius * 2);
      const y = dropRoyal(design, role, x, ignore);
      const royals = moving ? design.royals.map((royal, index) => index === ignore ? { ...royal, x, y } : royal) : [...design.royals, { role, x, y }];
      const local = { ...design, royals };
      const full = !moving && royalsPlaced(role) >= ROYAL_SET[role];
      const valid = !full && royalBox({ role, x, y }).y1 <= BUILD_HEIGHT && !layoutProblem(local);
      return { type: 'royal', role, x, y, valid, local };
    }
    return null;
  }, [ghostX, tool, selection, design, material, budget]); // eslint-disable-line react-hooks/exhaustive-deps

  // Stage lifecycle: the builder shows only your plot, in the battle's own art.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const stage = new Stage(canvas, 'day');
    stage.mode = 'build';
    stage.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    stageRef.current = stage;
    return () => { stage.destroy(); stageRef.current = null; };
  }, []);

  const bodyId = useCallback((selected: Selection) => (selected ? (selected.type === 'piece' ? selected.index + 1 : design.pieces.length + selected.index + 1) : null), [design.pieces.length]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || testing === 'running') return;
    if (!testing) stage.setWorld(createWorld(10, [design, null]), 0.6);
    stage.build = { ghost: ghost ? { ...ghost } : null, selected: ghost && !tool ? null : bodyId(selection) };
  }, [design, ghost, selection, tool, testing, bodyId]);

  const localX = (event: PointerEvent<HTMLCanvasElement>) => {
    const stage = stageRef.current;
    if (!stage) return null;
    const rect = event.currentTarget.getBoundingClientRect();
    const point = stage.toWorld(event.clientX - rect.left, event.clientY - rect.top);
    return { x: point.x - FORT_OFFSET, y: point.y - PLATEAU_Y };
  };

  const hitTest = (x: number, y: number): Selection => {
    const royal = design.royals.findIndex(entry => { const box = royalBox(entry); return x >= box.x0 && x <= box.x1 && y >= box.y0 && y <= box.y1; });
    if (royal >= 0) return { type: 'royal', index: royal };
    for (let index = design.pieces.length - 1; index >= 0; index--) {
      const box = pieceBox(design.pieces[index]);
      if (x >= box.x0 && x <= box.x1 && y >= box.y0 && y <= box.y1) return { type: 'piece', index };
    }
    return null;
  };

  const place = () => {
    if (!ghost?.valid) return;
    commit(ghost.local);
    if (!tool) { setSelection(null); setGhostX(null); }
    if (tool?.type === 'royal' && royalsPlaced(tool.role) + 1 >= ROYAL_SET[tool.role]) { setTool(null); setGhostX(null); }
  };

  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    const point = localX(event);
    if (!point) return;
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Capture is optional. */ }
    if (tool) { setGhostX(point.x); dragRef.current = { id: event.pointerId, moved: false }; return; }
    const hit = hitTest(point.x, point.y);
    setSelection(hit);
    setGhostX(null);
    if (hit) dragRef.current = { id: event.pointerId, moved: false };
  };
  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const point = localX(event);
    if (!point) return;
    if (tool && (event.pointerType === 'mouse' || dragRef.current)) setGhostX(point.x);
    else if (dragRef.current && selection) { dragRef.current.moved = true; setGhostX(point.x); }
  };
  const onPointerUp = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    if (tool || drag.moved) place();
  };

  const remove = () => {
    if (!selection) return;
    commit(selection.type === 'piece'
      ? { ...design, pieces: design.pieces.filter((_, index) => index !== selection.index) }
      : { ...design, royals: design.royals.filter((_, index) => index !== selection.index) });
    setSelection(null);
  };

  const recolor = (next: MaterialId) => {
    setMaterial(next);
    if (selection?.type !== 'piece') return;
    const piece = design.pieces[selection.index];
    if (!allowedMaterials(piece.kind).includes(next)) return;
    commit({ ...design, pieces: design.pieces.map((entry, index) => index === selection.index ? { ...entry, material: next } : entry) });
  };

  const nudge = (dx: number) => {
    const base = ghostX ?? (selection ? (selection.type === 'piece' ? design.pieces[selection.index].x : design.royals[selection.index].x) : 9);
    setGhostX(base + dx);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    const keys: Record<string, () => void> = {
      ArrowLeft: () => nudge(-GRID * (event.shiftKey ? 5 : 1)),
      ArrowRight: () => nudge(GRID * (event.shiftKey ? 5 : 1)),
      Enter: place,
      ' ': place,
      Delete: remove,
      Backspace: remove,
      Escape: () => { setTool(null); setSelection(null); setGhostX(null); },
      z: undo,
    };
    const action = keys[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  };

  const runTest = () => {
    const stage = stageRef.current;
    if (!stage || testing === 'running') return;
    const world = createWorld(10, [design, null]);
    const result = simulateShot(world, null, 0, { record: true, maxSeconds: 5 });
    let moved = 0;
    for (const body of world.bodies) {
      const after = result.world.bodies.find(entry => entry.id === body.id);
      if (!after || Math.hypot(after.x - body.x, after.y - body.y) > STABLE_DRIFT || Math.abs(after.a) > 0.2) moved++;
    }
    const fallen = world.bodies.filter(body => body.kind === 'royal').length - result.world.bodies.filter(body => body.kind === 'royal').length;
    setTesting('running');
    stage.build = { ghost: null, selected: null };
    void stage.play(result.replay!, result.world, 0).then(() => setTesting({ moved, fallen }));
  };

  const applyTemplate = (id: TemplateId) => {
    const scheme_ = SCHEMES[scheme];
    commit(templateDesign(id, { frame: scheme_.frame, floors: scheme_.floors, walls: scheme_.walls }));
    setSelection(null);
    setTool(null);
  };

  const selectedPiece = selection?.type === 'piece' ? design.pieces[selection.index] : null;
  const selectedRoyal = selection?.type === 'royal' ? design.royals[selection.index] : null;
  const status = testing === 'running' ? 'Shaking the foundations…'
    : testing ? (testing.moved === 0 ? '✅ Rock solid — nothing moved.' : `⚠️ ${testing.moved} piece${testing.moved === 1 ? '' : 's'} shifted${testing.fallen ? `, ${testing.fallen} royal fell` : ''}. Brace it before battle.`)
      : tool ? (tool.type === 'piece' ? `Placing ${PIECES[tool.kind].name}. Tap or drag on the plot, ← → to nudge, Enter to place.` : `Placing your ${ROYALS[tool.role].name}. Royals stand on floors or the ground.`)
        : selection ? 'Drag to move · pick a material to swap it · Delete removes it.'
          : 'Pick a piece, then tap the plot to drop it.';

  return (
    <section className={`glass ${s.builder}`} aria-labelledby="build-title">
      <header className={s.head}>
        <div>
          <p className="eyebrow">Build phase</p>
          <h1 id="build-title" className="mt-1 text-2xl font-black sm:text-3xl">{title}</h1>
        </div>
        <dl className={s.stats}>
          <div><dt>Build cost</dt><dd className={cost > budget ? 'text-red-300' : 'text-[#fde68a]'}>🪙 {cost}</dd></div>
          <div><dt>Ammo money</dt><dd className={budget - cost < 0 ? 'text-red-300' : 'text-[#fde68a]'}>🪙 {budget - cost}</dd></div>
          <div><dt>Toughness</dt><dd>{designHp(design).toLocaleString()} HP</dd></div>
          <div><dt>Pieces</dt><dd>{design.pieces.length}/{MAX_PIECES}</dd></div>
        </dl>
      </header>

      <div className={s.layout}>
        <div className={s.plotWrap} tabIndex={0} onKeyDown={onKeyDown} aria-label="Building plot. Left and right arrows move the piece, Enter places it, Delete removes the selected piece, Z undoes.">
          <canvas
            ref={canvasRef}
            className={s.plot}
            role="img"
            aria-label={`Your fortress: ${design.pieces.length} pieces, ${design.royals.length} of 3 royals placed.`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={event => { if (event.pointerType === 'mouse' && !dragRef.current && tool) setGhostX(null); }}
            onPointerCancel={() => { dragRef.current = null; }}
          />
          <div className={s.tools}>
            <button type="button" className={s.tool} onClick={undo} disabled={locked || !history.length} aria-label="Undo">↶</button>
            <button type="button" className={s.tool} onClick={runTest} disabled={testing === 'running' || !design.pieces.length} aria-label="Stress test the fortress">🧪</button>
            <button type="button" className={s.tool} onClick={() => { commit({ pieces: [], royals: [] }); setSelection(null); setGhostX(null); }} disabled={locked || (!design.pieces.length && !design.royals.length)} aria-label="Clear the plot">🗑️</button>
          </div>
          <p className={s.status} role="status">{status}</p>
        </div>

        <div className={s.palette}>
          <div className={s.tabs} role="tablist" aria-label="Build tools">
            {([['pieces', '🧱 Pieces'], ['royals', '👑 Royals'], ['templates', '📐 Templates']] as const).map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} className={s.tab} onClick={() => setTab(id)}>
                {label}{id === 'royals' && <span className={s.badge}>{design.royals.length}/3</span>}
              </button>
            ))}
          </div>

          {tab === 'pieces' && <>
            <div className={s.materials} role="radiogroup" aria-label="Material">
              {BUILD_MATERIALS.map(id => (
                <button key={id} type="button" role="radio" aria-checked={material === id} className={s.material} onClick={() => recolor(id)}>
                  <span className={s.swatch} style={{ background: SWATCH[id] }} aria-hidden="true" />
                  <span><strong>{MATERIAL_ICON[id]} {MATERIALS[id].name}</strong><small>🪙 {MATERIALS[id].costPerArea}/m² · {MATERIALS[id].hpPerArea} HP/m²</small></span>
                </button>
              ))}
            </div>
            <div className={s.pieces}>
              {PIECE_ORDER.map(kind => {
                const pieceMaterial = allowedMaterials(kind).includes(material) ? material : allowedMaterials(kind)[0];
                const active = tool?.type === 'piece' && tool.kind === kind;
                return (
                  <button key={kind} type="button" aria-pressed={active} className={s.piece} title={PIECES[kind].blurb}
                    onClick={() => { setTool(active ? null : { type: 'piece', kind }); setSelection(null); setGhostX(active ? null : 9); }}>
                    <PieceIcon kind={kind} material={pieceMaterial} />
                    <span className={s.pieceName}>{PIECES[kind].name}</span>
                    <span className={s.pieceCost}>🪙 {pieceCost(kind, pieceMaterial)}</span>
                  </button>
                );
              })}
            </div>
          </>}

          {tab === 'royals' && (
            <div className={s.royals}>
              {(['king', 'knight'] as RoyalRole[]).map(role => {
                const placed = royalsPlaced(role);
                const active = tool?.type === 'royal' && tool.role === role;
                return (
                  <button key={role} type="button" aria-pressed={active} className={s.piece} disabled={placed >= ROYAL_SET[role]}
                    onClick={() => { setTool(active ? null : { type: 'royal', role }); setSelection(null); setGhostX(active ? null : 9); }}>
                    <span className="text-3xl" aria-hidden="true">{ROYAL_ICON[role]}</span>
                    <span className={s.pieceName}>{ROYALS[role].name}</span>
                    <span className={s.pieceCost}>{placed}/{ROYAL_SET[role]} placed · {ROYALS[role].hp} HP</span>
                  </button>
                );
              })}
              <p className="col-span-2 text-xs text-white/65">Every fortress guards a King and two Knights. Knock out all three of theirs to win. Tuck yours behind walls and under floors.</p>
            </div>
          )}

          {tab === 'templates' && (
            <div className={s.templates}>
              <label className="text-xs font-bold" htmlFor="scheme">Materials</label>
              <select id="scheme" className="input !py-2" value={scheme} onChange={event => setScheme(event.target.value as Scheme)}>
                {(Object.keys(SCHEMES) as Scheme[]).map(id => <option key={id} value={id}>{SCHEMES[id].label}</option>)}
              </select>
              {TEMPLATE_ORDER.map(id => {
                const preview = templateDesign(id, SCHEMES[scheme]);
                return (
                  <button key={id} type="button" className={s.template} onClick={() => applyTemplate(id)}>
                    <span className="text-2xl" aria-hidden="true">{TEMPLATES[id].emoji}</span>
                    <span className="min-w-0 flex-1 text-left"><strong className="block">{TEMPLATES[id].name}</strong><small className="text-white/65">{TEMPLATES[id].blurb}</small></span>
                    <span className={`${s.pieceCost} ${designCost(preview) > budget ? 'text-red-300' : ''}`}>🪙 {designCost(preview)}</span>
                  </button>
                );
              })}
              <p className="text-xs text-white/65">A template replaces your plot. You can keep editing it afterwards.</p>
            </div>
          )}

          {(selectedPiece || selectedRoyal) && (
            <div className={s.selected} aria-live="polite">
              <strong>{selectedPiece ? `${MATERIAL_ICON[selectedPiece.material]} ${MATERIALS[selectedPiece.material].name} ${PIECES[selectedPiece.kind].name.toLowerCase()}` : `${ROYAL_ICON[selectedRoyal!.role]} ${ROYALS[selectedRoyal!.role].name}`}</strong>
              <div className={s.row}>
                <button type="button" className={s.tool} onClick={() => nudge(-GRID * 5)} aria-label="Move left">←</button>
                <button type="button" className={s.tool} onClick={() => nudge(GRID * 5)} aria-label="Move right">→</button>
                <button type="button" className={s.tool} onClick={place} disabled={!ghost?.valid} aria-label="Drop it here">⤓</button>
                <button type="button" className={`${s.tool} ${s.danger}`} onClick={remove} aria-label="Remove">🗑️</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {note}
      {problem && <p role="alert" className="text-sm text-amber-200">⚠️ {problem}</p>}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="button" className="btn" disabled={Boolean(problem) || busy} onClick={() => onConfirm(design)}>{busy ? 'Building…' : confirmLabel}</button>
        {onBack && <button type="button" className="btn-secondary" onClick={onBack}>{backLabel}</button>}
      </div>
    </section>
  );
}

