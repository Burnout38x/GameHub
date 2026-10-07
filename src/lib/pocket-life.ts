import { POCKET_GATE, pocketNeighbors, pocketServices, type PocketTile } from './pocket-paradise';

export type PocketJourney = {
  id: string;
  destination: number;
  tile: 'home' | 'stall';
  action: 'arrive-home' | 'shop';
  /** Gate, orthogonally connected paths, then the adjacent destination. */
  cells: number[];
  newlyServiced: boolean;
};
export type PocketLifeReason = 'no-gate-access' | 'missing-park' | 'missing-happy-home';
export type PocketLifeIssue = {
  cell: number;
  tile: 'home' | 'stall' | 'path';
  reasons: PocketLifeReason[];
  message: string;
};
export type PocketLife = { journeys: PocketJourney[]; issues: PocketLifeIssue[] };

/** A bounded visual explanation of v2 services, not a separate simulation or scoring engine.
 * Callers must not apply these access rules to classic saves.
 */
export function pocketLife(board: (PocketTile | null)[], previousBoard?: (PocketTile | null)[]): PocketLife {
  const services = pocketServices(board);
  const connected = new Set(services.connected);
  const happy = new Set(services.happyHomes);
  const open = new Set(services.openStalls);
  const previous = previousBoard ? pocketServices(previousBoard) : null;
  const previousHappy = new Set(previous?.happyHomes);
  const previousOpen = new Set(previous?.openStalls);

  // One BFS for all visitors. Parent links produce shortest actual road routes.
  const routes = new Map<number, number[]>();
  if (connected.has(POCKET_GATE)) {
    routes.set(POCKET_GATE, [POCKET_GATE]);
    const queue = [POCKET_GATE];
    for (let i = 0; i < queue.length; i++) {
      const cell = queue[i];
      for (const neighbor of pocketNeighbors(cell)) {
        if (connected.has(neighbor) && !routes.has(neighbor)) {
          routes.set(neighbor, [...routes.get(cell)!, neighbor]);
          queue.push(neighbor);
        }
      }
    }
  }

  const candidates: PocketJourney[] = [];
  const issues: PocketLifeIssue[] = [];
  board.forEach((tile, cell) => {
    if (tile !== 'home' && tile !== 'stall' && tile !== 'path') return;
    const neighbors = pocketNeighbors(cell);
    const reasons: PocketLifeReason[] = [];
    if (tile === 'path') {
      if (!connected.has(cell)) reasons.push('no-gate-access');
    } else {
      if (!neighbors.some(n => connected.has(n))) reasons.push('no-gate-access');
      if (tile === 'home' && !neighbors.some(n => board[n] === 'park')) reasons.push('missing-park');
      if (tile === 'stall' && !neighbors.some(n => happy.has(n))) reasons.push('missing-happy-home');
    }
    if (reasons.length) {
      const needs = reasons.map(reason => reason === 'no-gate-access'
        ? tile === 'path' ? 'a continuous path to the gate' : 'a neighboring path connected to the gate'
        : reason === 'missing-park' ? 'a neighboring park' : 'a neighboring happy home');
      issues.push({ cell, tile, reasons, message: `Needs ${needs.join(' and ')}.` });
    }
    if (tile === 'path' || !(tile === 'home' ? happy.has(cell) : open.has(cell))) return;
    const entrances = neighbors.filter(n => routes.has(n)).sort((a, b) => routes.get(a)!.length - routes.get(b)!.length || a - b);
    const entrance = entrances[0];
    if (entrance === undefined) return;
    candidates.push({
      id: `${tile}-${cell}`,
      destination: cell,
      tile,
      action: tile === 'home' ? 'arrive-home' : 'shop',
      cells: [...routes.get(entrance)!, cell],
      newlyServiced: previous !== null && !(tile === 'home' ? previousHappy : previousOpen).has(cell),
    });
  });

  // Newly unlocked services get first attention; otherwise show both kinds of activity.
  const journeys: PocketJourney[] = [];
  while (candidates.length && journeys.length < 3) {
    candidates.sort((a, b) => Number(b.newlyServiced) - Number(a.newlyServiced)
      || journeys.filter(j => j.tile === a.tile).length - journeys.filter(j => j.tile === b.tile).length
      || a.destination - b.destination);
    journeys.push(candidates.shift()!);
  }
  return { journeys, issues };
}
