'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BLUEPRINTS, BLUEPRINT_ORDER, BUILD_MATERIALS, MATERIALS, PART_NAMES, PLATEAU_Y, designCost, type FortressDesign, type MaterialId, type PartId } from '@/lib/fortress/content';
import { placeFortress, type WorldState } from '@/lib/fortress/world';
import { drawBanner, drawBlock, drawRoyal, PALETTES } from './scene/art';

const PARTS: PartId[] = ['frame', 'floors', 'walls'];
const MATERIAL_ICON: Record<MaterialId, string> = { wood: '🪵', stone: '🧱', steel: '⛓️', glass: '🪟' };

function partCost(design: FortressDesign, part: PartId, material: MaterialId): number {
  return Math.round(BLUEPRINTS[design.blueprint].blocks.filter(block => block.part === part && !block.glass)
    .reduce((sum, block) => sum + block.w * block.h * MATERIALS[material].costPerArea, 0));
}

function fortressHp(design: FortressDesign): number {
  return Math.round(BLUEPRINTS[design.blueprint].blocks.reduce((sum, block) => {
    const material = block.glass ? 'glass' : design.materials[block.part];
    return sum + Math.max(20, block.w * block.h * MATERIALS[material].hpPerArea);
  }, 0));
}

/** Live drawing of the fortress being designed. */
function FortressPreview({ design }: { design: FortressDesign }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const world: WorldState = { terrain: [], bodies: [], nextId: 1 };
    placeFortress(world, 0, design);
    const palette = PALETTES.day;
    const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
    sky.addColorStop(0, palette.skyTop);
    sky.addColorStop(1, palette.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Fit the fortress (about 20 m wide, 12 m tall) to the canvas.
    const scale = Math.min(canvas.width / 24, canvas.height / 13.5);
    ctx.setTransform(scale, 0, 0, -scale, canvas.width / 2 - 25 * scale, canvas.height - 1.2 * scale + PLATEAU_Y * scale);
    ctx.fillStyle = palette.dirt;
    ctx.fillRect(0, -6, 60, PLATEAU_Y + 6);
    ctx.fillStyle = palette.grass;
    ctx.fillRect(0, PLATEAU_Y - 0.3, 60, 0.4);
    drawBanner(ctx, 0, 12.4, 0.8, 1);
    for (const body of world.bodies) {
      ctx.save();
      ctx.translate(body.x, body.y);
      if (body.kind === 'block') drawBlock(ctx, body);
      else drawRoyal(ctx, body, 0, 1);
      ctx.restore();
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }, [design]);
  return <canvas ref={ref} className="h-48 w-full rounded-2xl sm:h-56" role="img" aria-label={`${BLUEPRINTS[design.blueprint].name} preview`} />;
}

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

/** Choose a fortress layout and what each part is built from. Better materials cost gold you could spend on ammo. */
export default function BuildScreen({ title, budget, initial, confirmLabel, onConfirm, onBack, backLabel = 'Back', busy = false, note }: Props) {
  const [design, setDesign] = useState<FortressDesign>(initial);
  const cost = designCost(design);
  const left = budget - cost;
  const blueprint = BLUEPRINTS[design.blueprint];

  return (
    <section className="glass mx-auto flex w-full max-w-4xl flex-col gap-5 p-4 sm:p-6" aria-labelledby="build-title">
      <div>
        <p className="eyebrow">Build phase</p>
        <h1 id="build-title" className="mt-1 text-2xl font-black sm:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-white/70">Stronger materials soak up more punishment but cost gold — and whatever you don’t spend here buys ammunition in battle.</p>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col gap-3">
          <FortressPreview design={design} />
          <dl className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="glass-sm p-2"><dt className="text-white/60">Build cost</dt><dd className="text-lg font-black text-[#fde68a]">🪙 {cost}</dd></div>
            <div className="glass-sm p-2"><dt className="text-white/60">Ammo money</dt><dd className={`text-lg font-black ${left < 0 ? 'text-red-300' : 'text-[#fde68a]'}`}>🪙 {left}</dd></div>
            <div className="glass-sm p-2"><dt className="text-white/60">Toughness</dt><dd className="text-lg font-black">{fortressHp(design).toLocaleString()} HP</dd></div>
          </dl>
        </div>
        <div className="flex flex-col gap-4">
          <fieldset>
            <legend className="text-sm font-bold">Layout</legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {BLUEPRINT_ORDER.map(id => (
                <button key={id} type="button" aria-pressed={design.blueprint === id} onClick={() => setDesign(current => ({ ...current, blueprint: id }))}
                  className={`glass-sm grid justify-items-center gap-1 p-3 text-center transition ${design.blueprint === id ? 'ring-2 ring-[#fde047]' : 'hover:ring-1 hover:ring-white/40'}`}>
                  <span aria-hidden="true" className="text-2xl">{BLUEPRINTS[id].emoji}</span>
                  <span className="text-xs font-bold">{BLUEPRINTS[id].name}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-white/65">{blueprint.blurb}</p>
          </fieldset>
          {PARTS.map(part => (
            <fieldset key={part}>
              <legend className="text-sm font-bold">{PART_NAMES[part]}</legend>
              <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label={PART_NAMES[part]}>
                {BUILD_MATERIALS.map(material => {
                  const selected = design.materials[part] === material;
                  const price = partCost(design, part, material);
                  return (
                    <button key={material} type="button" role="radio" aria-checked={selected}
                      onClick={() => setDesign(current => ({ ...current, materials: { ...current.materials, [part]: material } }))}
                      className={`glass-sm grid justify-items-center gap-0.5 p-2 text-center transition ${selected ? 'ring-2 ring-[#fde047]' : 'hover:ring-1 hover:ring-white/40'}`}>
                      <span aria-hidden="true" className="text-xl">{MATERIAL_ICON[material]}</span>
                      <span className="text-xs font-bold">{MATERIALS[material].name}</span>
                      <span className="text-[11px] font-black text-[#fde68a]">{price ? `🪙 ${price}` : 'Free'}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
      </div>
      {note}
      {left < 0 && <p role="alert" className="text-sm text-red-200">That costs more gold than you have. Swap something for a cheaper material.</p>}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="button" className="btn" disabled={left < 0 || busy} onClick={() => onConfirm(design)}>{busy ? 'Building…' : confirmLabel}</button>
        {onBack && <button type="button" className="btn-secondary" onClick={onBack}>{backLabel}</button>}
      </div>
    </section>
  );
}
