import { CARDS, DEFENSES, FIELD_LENGTH, LANES, MILLI, upgradeCost, type DefenseId } from './content';
import { commandError, type CommandBody } from './commands';
import { enemyOf, padSlot, randomInt, aiProfile, type BattleState, type Side } from './state';

/** Lanes the AI fortifies first: centre, then the flanks. */
const LANE_PRIORITY = [1, 0, 2];
/** How close (from its own keep) an enemy unit must be to count as a threat. */
const THREAT_DEPTH = 560;

/** Total enemy troop health pushing into each of the AI's lanes. */
function laneThreat(state: BattleState, side: Side): number[] {
  const threat = Array.from({ length: LANES }, () => 0);
  const enemy = enemyOf(side);
  for (const unit of state.units) {
    if (unit.side !== enemy) continue;
    const depth = side === 1 ? FIELD_LENGTH - unit.y : unit.y;
    if (depth <= THREAT_DEPTH) threat[unit.lane] += unit.hp;
  }
  return threat;
}

/** Combined health of a side's buildings in each lane — the AI attacks where it is lowest. */
function laneDefense(state: BattleState, side: Side): number[] {
  return Array.from({ length: LANES }, (_, lane) =>
    [lane, lane + LANES].reduce((sum, pad) => sum + (state.pads[padSlot(side, pad)]?.hp ?? 0), 0));
}

function pickBuild(state: BattleState, player: number, lane: number, builds: DefenseId[]): CommandBody | null {
  const side = state.wallets[player].side;
  const choice = builds[randomInt(state, builds.length)];
  // Saves up for the chosen building instead of settling for whatever is cheapest.
  if (state.wallets[player].gold < DEFENSES[choice].cost) return null;
  const options = choice === 'mine' ? [lane, lane + LANES] : [lane + LANES, lane];
  for (const pad of options) {
    if (state.pads[padSlot(side, pad)]) continue;
    const body: CommandBody = { k: 'build', pad, def: choice };
    if (!commandError(state, player, body)) return body;
  }
  return null;
}

function planBuild(state: BattleState, player: number, threat: number[]): CommandBody | null {
  const profile = aiProfile(state);
  const side = state.wallets[player].side;
  const cheapest = Math.min(...profile.builds.map(id => DEFENSES[id].cost));
  if (state.wallets[player].gold < cheapest) return null;
  const pressed = threat.indexOf(Math.max(...threat));
  const lanes = threat[pressed] > 0 ? [pressed, ...LANE_PRIORITY.filter(l => l !== pressed)] : LANE_PRIORITY;
  for (const lane of lanes) {
    const built = [lane, lane + LANES].filter(pad => state.pads[padSlot(side, pad)]).length;
    if (built < 2 && (built === 0 || threat[lane] > 0 || randomInt(state, 3) === 0)) {
      const build = pickBuild(state, player, lane, profile.builds.filter(id => id !== 'mine' || built > 0));
      if (build) return build;
    }
  }
  // Every plot is busy: strengthen the weakest building it can afford.
  const upgradable = Array.from({ length: LANES * 2 }, (_, pad) => pad)
    .map(pad => ({ pad, structure: state.pads[padSlot(side, pad)] }))
    .filter(({ structure }) => structure && structure.level < 3 && structure.def !== 'keep' && state.wallets[player].gold >= upgradeCost(structure.def as DefenseId, structure.level))
    .sort((a, b) => a.structure!.level - b.structure!.level || a.pad - b.pad);
  return upgradable.length ? { k: 'upgrade', pad: upgradable[0].pad } : null;
}

/** How long an AI wave keeps feeding the same lane. */
const PUSH_TICKS = 70;

function weakestLane(state: BattleState, side: Side): number {
  const defense = laneDefense(state, enemyOf(side));
  const weakest = Math.min(...defense);
  const candidates = defense.map((value, index) => ({ value, index })).filter(entry => entry.value === weakest).map(entry => entry.index);
  return candidates[randomInt(state, candidates.length)];
}

/** Enemy troops this close to the AI keep force an immediate answer. */
const URGENT_DEPTH = 330;

function urgentLane(state: BattleState, side: Side): number {
  const enemy = enemyOf(side);
  let lane = -1;
  let worst = 0;
  for (const unit of state.units) {
    if (unit.side !== enemy) continue;
    const depth = side === 1 ? FIELD_LENGTH - unit.y : unit.y;
    if (depth <= URGENT_DEPTH && unit.hp > worst) { worst = unit.hp; lane = unit.lane; }
  }
  return lane;
}

function planAttack(state: BattleState, player: number, threat: number[]): CommandBody | null {
  const profile = aiProfile(state);
  const wallet = state.wallets[player];
  const urgent = urgentLane(state, wallet.side);
  const pushing = state.tick < wallet.pushUntil;
  let card = profile.cards[randomInt(state, profile.cards.length)];
  if (CARDS[card].cost * MILLI > wallet.elixir) {
    // Save up for the card it wants, unless troops are about to reach its buildings.
    if (urgent < 0) return null;
    const affordable = profile.cards.filter(id => CARDS[id].cost * MILLI <= wallet.elixir && !CARDS[id].spell && !CARDS[id].buildingsOnly);
    if (!affordable.length) return null;
    card = affordable[randomInt(state, affordable.length)];
  }
  const defending = urgent >= 0 && randomInt(state, 100) < profile.defendChance && !CARDS[card].buildingsOnly && !CARDS[card].spell;
  if (!defending && !pushing && wallet.elixir < profile.bank * MILLI) return null;
  let lane: number;
  if (defending) lane = urgent;
  else if (pushing) lane = wallet.pushLane;
  else {
    lane = threat.some(value => value > 0) && randomInt(state, 2) === 0 ? threat.indexOf(Math.max(...threat)) : weakestLane(state, wallet.side);
    // A full bank starts a wave: the next few cards follow into the same lane.
    wallet.pushLane = lane;
    wallet.pushUntil = state.tick + PUSH_TICKS;
  }
  const body: CommandBody = { k: 'deploy', card, lane };
  return commandError(state, player, body) ? null : body;
}

/** One deterministic decision cycle for the AI wallet. */
export function aiDecisions(state: BattleState, player: number): CommandBody[] {
  const profile = aiProfile(state);
  if ((state.tick + 3) % profile.thinkEvery !== 0) return [];
  const threat = laneThreat(state, state.wallets[player].side);
  const decisions: CommandBody[] = [];
  const build = planBuild(state, player, threat);
  if (build) decisions.push(build);
  const attack = planAttack(state, player, threat);
  if (attack) decisions.push(attack);
  return decisions;
}

/** Exposed for tests: where the AI would see pressure. */
export const __aiInternals = { laneThreat, laneDefense };
