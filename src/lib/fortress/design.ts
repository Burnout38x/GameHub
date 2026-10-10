import { MATERIALS, ROYALS, type MaterialId, type RoyalRole } from './content';

/**
 * Fortresses are built from a catalog of pieces placed on a grid in front of each player's
 * trebuchet. Local coordinates: x runs from the back of the plot (0) towards the enemy,
 * y up from the plateau. Positions are piece centres (bounding-box centres for roofs).
 */
export type PieceKind = 'post' | 'column' | 'beam' | 'span' | 'block' | 'wall' | 'roof' | 'peak' | 'window';
export type PieceShape = 'box' | 'tri';
export interface PieceSpec { kind: PieceKind; name: string; w: number; h: number; shape: PieceShape; glass?: boolean; blurb: string }

export const PIECES: Record<PieceKind, PieceSpec> = {
  post: { kind: 'post', name: 'Post', w: 0.6, h: 2.4, shape: 'box', blurb: 'Slim upright that holds a floor.' },
  column: { kind: 'column', name: 'Column', w: 0.8, h: 3.6, shape: 'box', blurb: 'Tall, sturdy upright.' },
  beam: { kind: 'beam', name: 'Beam', w: 3.6, h: 0.5, shape: 'box', blurb: 'Short floor or lintel.' },
  span: { kind: 'span', name: 'Long floor', w: 7.2, h: 0.5, shape: 'box', blurb: 'A whole storey in one piece.' },
  block: { kind: 'block', name: 'Block', w: 1.2, h: 1.2, shape: 'box', blurb: 'Battlements, bracing and ballast.' },
  wall: { kind: 'wall', name: 'Wall', w: 1.2, h: 2.4, shape: 'box', blurb: 'Thick shield against direct hits.' },
  roof: { kind: 'roof', name: 'Roof', w: 3.6, h: 1.6, shape: 'tri', blurb: 'Deflects shots that drop from above.' },
  peak: { kind: 'peak', name: 'Spire', w: 2, h: 2, shape: 'tri', blurb: 'A pointed cap for a tower.' },
  window: { kind: 'window', name: 'Window', w: 1.2, h: 1.2, shape: 'box', glass: true, blurb: 'Light and cheap — and fragile.' },
};
export const PIECE_ORDER: PieceKind[] = ['post', 'column', 'beam', 'span', 'block', 'wall', 'roof', 'peak', 'window'];

export interface Piece { kind: PieceKind; material: MaterialId; x: number; y: number }
export interface RoyalSpot { role: RoyalRole; x: number; y: number }
export interface FortressDesign { pieces: Piece[]; royals: RoyalSpot[] }

export const BUILD_WIDTH = 18;
export const BUILD_HEIGHT = 15;
export const MAX_PIECES = 36;
export const GRID = 0.2;
/** Every fortress guards exactly one King and two Knights. */
export const ROYAL_SET: Record<RoyalRole, number> = { king: 1, knight: 2 };

export const pieceArea = (kind: PieceKind): number => {
  const spec = PIECES[kind];
  return spec.shape === 'tri' ? (spec.w * spec.h) / 2 : spec.w * spec.h;
};
export const pieceCost = (kind: PieceKind, material: MaterialId): number => Math.round(pieceArea(kind) * MATERIALS[material].costPerArea);
export const designCost = (design: FortressDesign): number => design.pieces.reduce((sum, piece) => sum + pieceCost(piece.kind, piece.material), 0);
export const designHp = (design: FortressDesign): number => Math.round(design.pieces.reduce((sum, piece) => sum + Math.max(20, pieceArea(piece.kind) * MATERIALS[piece.material].hpPerArea), 0));
export const allowedMaterials = (kind: PieceKind): MaterialId[] => (PIECES[kind].glass ? ['glass'] : ['wood', 'stone', 'steel']);

// ── Templates ────────────────────────────────────────────────────────────

export type TemplateId = 'outpost' | 'keep' | 'bastion' | 'spire';
type Part = 'frame' | 'floors' | 'walls';
export interface TemplateMaterials { frame: MaterialId; floors: MaterialId; walls: MaterialId }
export const PART_NAMES: Record<Part, string> = { frame: 'Uprights', floors: 'Floors & roofs', walls: 'Walls & battlements' };
const PART_OF: Record<PieceKind, Part | null> = { post: 'frame', column: 'frame', beam: 'floors', span: 'floors', roof: 'floors', peak: 'floors', block: 'walls', wall: 'walls', window: null };

type Spot = [PieceKind, number, number];
interface Template { id: TemplateId; name: string; emoji: string; blurb: string; pieces: Spot[]; royals: [RoyalRole, number, number][] }
export const TEMPLATES: Record<TemplateId, Template> = {
  outpost: {
    id: 'outpost', name: 'Timber Outpost', emoji: '⛺', blurb: 'One storey with a lookout on the roof. Cheap to build, quick to fall.',
    pieces: [
      ['post', 1.0, 1.2], ['post', 4.4, 1.2], ['post', 7.8, 1.2], ['span', 4.4, 2.65],
      ['block', 1.4, 3.5], ['block', 7.4, 3.5], ['wall', 10.6, 1.2],
    ],
    royals: [['king', 2.7, 0.65], ['knight', 6.1, 0.6], ['knight', 4.4, 3.5]],
  },
  keep: {
    id: 'keep', name: 'Royal Keep', emoji: '🏰', blurb: 'A two-storey hall under a pitched roof, behind a battlemented wall.',
    pieces: [
      ['post', 1.0, 1.2], ['post', 4.4, 1.2], ['post', 7.8, 1.2], ['span', 4.4, 2.65],
      ['post', 2.0, 4.1], ['post', 6.8, 4.1], ['window', 4.4, 3.5], ['span', 4.4, 5.55], ['roof', 4.4, 6.6],
      ['wall', 10.6, 1.2], ['wall', 10.6, 3.6], ['block', 10.6, 5.4], ['wall', 11.9, 1.2], ['block', 11.9, 3.0],
    ],
    royals: [['king', 2.7, 0.65], ['knight', 6.1, 0.6], ['knight', 3.1, 3.5]],
  },
  bastion: {
    id: 'bastion', name: 'Iron Bastion', emoji: '🛡️', blurb: 'Low and wide with a double front wall and battlements.',
    pieces: [
      ['post', 0.8, 1.2], ['post', 4.4, 1.2], ['post', 8.0, 1.2], ['span', 4.4, 2.65],
      ['post', 1.6, 4.1], ['post', 7.2, 4.1], ['span', 4.4, 5.55],
      ['block', 1.4, 6.4], ['block', 4.4, 6.4], ['block', 7.4, 6.4],
      ['wall', 10.0, 1.2], ['wall', 10.0, 3.6], ['wall', 11.3, 1.2], ['wall', 11.3, 3.6], ['wall', 12.6, 1.2], ['block', 12.6, 3.0],
    ],
    royals: [['king', 2.6, 0.65], ['knight', 6.2, 0.6], ['knight', 4.4, 3.5]],
  },
  spire: {
    id: 'spire', name: 'Sky Spire', emoji: '🗼', blurb: 'Three storeys and a spire. Hard to reach, harder to topple.',
    pieces: [
      ['column', 2.0, 1.8], ['column', 6.0, 1.8], ['span', 4.0, 3.85],
      ['post', 2.4, 5.3], ['post', 5.6, 5.3], ['beam', 4.0, 6.75],
      ['post', 2.8, 8.2], ['post', 5.2, 8.2], ['beam', 4.0, 9.65], ['peak', 4.0, 10.9],
      ['wall', 9.4, 1.2], ['wall', 9.4, 3.6], ['block', 10.8, 0.6],
    ],
    royals: [['knight', 4.0, 0.6], ['king', 4.0, 4.75], ['knight', 4.0, 7.6]],
  },
};
export const TEMPLATE_ORDER: TemplateId[] = ['outpost', 'keep', 'bastion', 'spire'];

export function templateDesign(id: TemplateId, materials: TemplateMaterials): FortressDesign {
  const template = TEMPLATES[id];
  return {
    pieces: template.pieces.map(([kind, x, y]) => {
      const part = PART_OF[kind];
      return { kind, x, y, material: part ? materials[part] : 'glass' };
    }),
    royals: template.royals.map(([role, x, y]) => ({ role, x, y })),
  };
}
export const DEFAULT_DESIGN: FortressDesign = templateDesign('keep', { frame: 'wood', floors: 'wood', walls: 'stone' });

// ── Geometry & validation ────────────────────────────────────────────────

export interface Box { x0: number; y0: number; x1: number; y1: number }
const EPSILON = 0.02;
export const pieceBox = (piece: Pick<Piece, 'kind' | 'x' | 'y'>): Box => {
  const { w, h } = PIECES[piece.kind];
  return { x0: piece.x - w / 2, y0: piece.y - h / 2, x1: piece.x + w / 2, y1: piece.y + h / 2 };
};
export const royalBox = (royal: Pick<RoyalSpot, 'role' | 'x' | 'y'>): Box => {
  const r = ROYALS[royal.role].radius;
  return { x0: royal.x - r, y0: royal.y - r, x1: royal.x + r, y1: royal.y + r };
};
const overlaps = (a: Box, b: Box) => a.x0 < b.x1 - EPSILON && b.x0 < a.x1 - EPSILON && a.y0 < b.y1 - EPSILON && b.y0 < a.y1 - EPSILON;
const inZone = (box: Box) => box.x0 >= -EPSILON && box.x1 <= BUILD_WIDTH + EPSILON && box.y0 >= -EPSILON && box.y1 <= BUILD_HEIGHT + EPSILON;
export const snap = (value: number): number => Math.round(value / GRID) * GRID;
const tidy = (value: number) => Math.round(value * 100) / 100;

/** Placement problems only: pieces or royals outside the plot or overlapping each other. */
export function layoutProblem(design: FortressDesign): string | null {
  const boxes = design.pieces.map(pieceBox);
  if (boxes.some(box => !inZone(box))) return 'A piece sticks out of your building plot.';
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) if (overlaps(boxes[i], boxes[j])) return 'Two pieces overlap.';
  const crowns = design.royals.map(royalBox);
  if (crowns.some(box => !inZone(box))) return 'A royal is outside your building plot.';
  for (let i = 0; i < crowns.length; i++) {
    if (boxes.some(box => overlaps(box, crowns[i]))) return 'A royal is stuck inside a piece.';
    for (let j = i + 1; j < crowns.length; j++) if (overlaps(crowns[i], crowns[j])) return 'Two royals are standing in the same spot.';
  }
  return null;
}

/** Why a design can't be used, in words a player understands — or null if it's fine. */
export function designProblem(design: FortressDesign, budget: number): string | null {
  if (!design.pieces.length) return 'Place at least one piece.';
  if (design.pieces.length > MAX_PIECES) return `A fortress can have at most ${MAX_PIECES} pieces.`;
  const layout = layoutProblem(design);
  if (layout) return layout;
  for (const role of ['king', 'knight'] as RoyalRole[]) {
    const count = design.royals.filter(royal => royal.role === role).length;
    if (count !== ROYAL_SET[role]) return role === 'king' ? 'Place your King (Royals tab).' : 'Place both Knights (Royals tab).';
  }
  if (design.royals.length !== 3) return 'Place your King and two Knights.';
  if (designCost(design) > budget) return 'This fortress costs more gold than you have.';
  return null;
}

/** Reads an untrusted design (network or storage). Returns null unless it is fully valid. */
export function parseDesign(value: unknown, budget: number): FortressDesign | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as { pieces?: unknown; royals?: unknown };
  if (!Array.isArray(raw.pieces) || !Array.isArray(raw.royals) || raw.pieces.length > MAX_PIECES || raw.royals.length > 3) return null;
  const pieces: Piece[] = [];
  for (const entry of raw.pieces) {
    if (!entry || typeof entry !== 'object') return null;
    const { kind, material, x, y } = entry as Record<string, unknown>;
    if (typeof kind !== 'string' || !Object.hasOwn(PIECES, kind)) return null;
    if (typeof material !== 'string' || !allowedMaterials(kind as PieceKind).includes(material as MaterialId)) return null;
    if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) return null;
    pieces.push({ kind: kind as PieceKind, material: material as MaterialId, x: tidy(x), y: tidy(y) });
  }
  const royals: RoyalSpot[] = [];
  for (const entry of raw.royals) {
    if (!entry || typeof entry !== 'object') return null;
    const { role, x, y } = entry as Record<string, unknown>;
    if (role !== 'king' && role !== 'knight') return null;
    if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) return null;
    royals.push({ role, x: tidy(x), y: tidy(y) });
  }
  const design = { pieces, royals };
  return designProblem(design, budget) ? null : design;
}

/** Where something dropped at `x` comes to rest: on the ground or on whatever is below it. */
function restingY(boxes: Box[], x0: number, x1: number, height: number): number {
  let floor = 0;
  for (const box of boxes) if (x0 < box.x1 - EPSILON && box.x0 < x1 - EPSILON) floor = Math.max(floor, box.y1);
  return tidy(floor + height / 2);
}

export function dropPiece(design: FortressDesign, kind: PieceKind, x: number, ignore = -1): number {
  const { w, h } = PIECES[kind];
  const boxes = [...design.pieces.filter((_, index) => index !== ignore).map(pieceBox), ...design.royals.map(royalBox)];
  return restingY(boxes, x - w / 2, x + w / 2, h);
}

export function dropRoyal(design: FortressDesign, role: RoyalRole, x: number, ignore = -1): number {
  const r = ROYALS[role].radius;
  const boxes = [...design.pieces.map(pieceBox), ...design.royals.filter((_, index) => index !== ignore).map(royalBox)];
  return restingY(boxes, x - r, x + r, r * 2) + 0.01;
}

/** Keeps a piece of this width inside the plot. */
export const clampX = (x: number, width: number): number => tidy(Math.min(BUILD_WIDTH - width / 2, Math.max(width / 2, snap(x))));
