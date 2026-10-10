import {
  CARDS, DEFENSES, LANES, MAX_LEVEL, MILLI, PADS_PER_SIDE, SELL_REFUND_PERCENT, SPAWN_Y, levelScale, upgradeCost,
  type CardId, type DefenseId,
} from './content';
import {
  enemyOf, forward, padSlot, padY, placeStructure, randomInt, worldY,
  type BattleState, type Side, type Structure,
} from './state';

export type CommandBody =
  | { k: 'deploy'; card: CardId; lane: number }
  | { k: 'build'; pad: number; def: DefenseId }
  | { k: 'upgrade'; pad: number }
  | { k: 'sell'; pad: number };
/** A command scheduled for a tick by a player (wallet index). */
export type BattleCommand = CommandBody & { t: number; p: number };

const isIndex = (value: unknown, size: number): value is number => Number.isInteger(value) && (value as number) >= 0 && (value as number) < size;

/** Normalizes untrusted input into a command body, or null. */
export function parseCommandBody(value: unknown): CommandBody | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  if (raw.k === 'deploy' && typeof raw.card === 'string' && Object.hasOwn(CARDS, raw.card) && isIndex(raw.lane, LANES)) return { k: 'deploy', card: raw.card as CardId, lane: raw.lane };
  if (raw.k === 'build' && typeof raw.def === 'string' && Object.hasOwn(DEFENSES, raw.def) && isIndex(raw.pad, PADS_PER_SIDE)) return { k: 'build', pad: raw.pad, def: raw.def as DefenseId };
  if ((raw.k === 'upgrade' || raw.k === 'sell') && isIndex(raw.pad, PADS_PER_SIDE)) return { k: raw.k, pad: raw.pad };
  return null;
}

/** Why a command cannot happen right now, in player-facing words; null when it is legal. */
export function commandError(state: BattleState, player: number, body: CommandBody): string | null {
  if (state.outcome) return 'The battle is over.';
  const wallet = state.wallets[player];
  if (!wallet) return 'You are not commanding this battle.';
  if (body.k === 'deploy') {
    const card = CARDS[body.card];
    if (!card) return 'Unknown troop.';
    if (wallet.elixir < card.cost * MILLI) return `Need ${card.cost} elixir.`;
    if (card.spell && !meteorTarget(state, wallet.side, body.lane)) return 'Nothing to hit in that lane.';
    return null;
  }
  const structure = state.pads[padSlot(wallet.side, body.pad)];
  if (body.k === 'build') {
    if (structure) return 'That plot is taken. Upgrade or sell it instead.';
    return wallet.gold < DEFENSES[body.def].cost ? `Need ${DEFENSES[body.def].cost} gold.` : null;
  }
  if (!structure) return 'Build something on this plot first.';
  if (body.k === 'sell') return null;
  if (structure.level >= MAX_LEVEL) return 'Already at max level.';
  const cost = upgradeCost(structure.def as DefenseId, structure.level);
  return wallet.gold < cost ? `Need ${cost} gold.` : null;
}

/** The first enemy building a Meteor in this lane would hit: the closest to the river, else the keep. */
export function meteorTarget(state: BattleState, side: Side, lane: number): Structure | null {
  const enemy = enemyOf(side);
  const front = state.pads[padSlot(enemy, lane + LANES)];
  const back = state.pads[padSlot(enemy, lane)];
  const keep = state.keeps[enemy];
  return front ?? back ?? (keep.hp > 0 ? keep : null);
}

/** Applies a legal command. Returns false (and changes nothing) when it is not legal at this moment. */
export function applyCommand(state: BattleState, player: number, body: CommandBody): boolean {
  if (commandError(state, player, body)) return false;
  const wallet = state.wallets[player];
  const side = wallet.side;
  if (body.k === 'deploy') {
    const card = CARDS[body.card];
    wallet.elixir -= card.cost * MILLI;
    state.stats[side].deployed++;
    if (card.spell) { castMeteor(state, side, body.lane); return true; }
    for (let i = 0; i < card.count; i++) {
      const y = worldY(side, SPAWN_Y) - forward(side) * i * 14;
      const hp = card.hp;
      state.units.push({
        id: state.nextId++, side, card: card.id, lane: body.lane, y, py: y, hp, maxHp: hp,
        cd: 0, slow: 0, xo: randomInt(state, 25) - 12, owner: player,
      });
    }
    return true;
  }
  const slot = padSlot(side, body.pad);
  const lane = body.pad % LANES;
  if (body.k === 'build') {
    wallet.gold -= DEFENSES[body.def].cost;
    placeStructure(state, side, body.pad, body.def);
    state.fx.push({ k: 'build', lane, y: padY(side, body.pad), side });
    return true;
  }
  const structure = state.pads[slot]!;
  if (body.k === 'sell') {
    wallet.gold += Math.floor((structure.spent * SELL_REFUND_PERCENT) / 100);
    state.pads[slot] = null;
    return true;
  }
  const def = structure.def as DefenseId;
  const cost = upgradeCost(def, structure.level);
  wallet.gold -= cost;
  const ratio = structure.hp / structure.maxHp;
  structure.level++;
  structure.maxHp = levelScale(DEFENSES[def].hp, structure.level);
  structure.hp = Math.max(1, Math.round(structure.maxHp * ratio));
  structure.spent += cost;
  state.fx.push({ k: 'build', lane, y: structure.y, side });
  return true;
}

/** The keep shrugs off most spell damage so Meteor stays a siege tool, not a win button. */
const KEEP_SPELL_PERCENT = 35;

function castMeteor(state: BattleState, side: Side, lane: number): void {
  const spell = CARDS.meteor.spell!;
  const target = meteorTarget(state, side, lane)!;
  const enemy = enemyOf(side);
  const impactY = target.def === 'keep' ? target.y + forward(enemy) * 60 : target.y;
  const structureDamage = target.def === 'keep' ? Math.floor((spell.structureDamage * KEEP_SPELL_PERCENT) / 100) : spell.structureDamage;
  damageStructure(state, target, structureDamage, side);
  for (const unit of state.units) {
    if (unit.side === enemy && unit.lane === lane && Math.abs(unit.y - impactY) <= spell.radius) hurtUnit(unit, spell.unitDamage);
  }
  state.fx.push({ k: 'shot', kind: 'meteor', side, fromLane: lane, fromY: worldY(side, 500), toLane: lane, toY: impactY });
  state.fx.push({ k: 'boom', lane, y: impactY, size: 3, side });
}

export function damageStructure(state: BattleState, structure: Structure, amount: number, by: Side): void {
  if (structure.hp <= 0) return;
  const dealt = Math.min(structure.hp, amount);
  structure.hp -= dealt;
  state.stats[by].damage += dealt;
  state.fx.push({ k: 'damage', lane: structure.lane < 0 ? 1 : structure.lane, y: structure.y, amount: dealt, side: structure.side });
}

export function hurtUnit(unit: { hp: number }, amount: number): void {
  unit.hp -= Math.min(Math.max(0, unit.hp), amount);
}
