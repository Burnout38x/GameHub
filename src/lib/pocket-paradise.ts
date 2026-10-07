export const POCKET_TILES = ['home', 'stall', 'park', 'path'] as const;
export type PocketTile = typeof POCKET_TILES[number];
export type PocketMode = 'standard' | 'daily' | 'practice';
export type PocketMove = { cell: number; offer: number };
export type PocketRun = { version: 1; rulesVersion?: 2; seed: string; mode: PocketMode; moves: PocketMove[]; board: (PocketTile | null)[] };
export const POCKET_LABELS: Record<PocketTile, string> = { home: 'Home', stall: 'Food stall', park: 'Park', path: 'Path' };
export function pocketHash(value: string): number { let h = 2166136261; for (const c of value) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
export function pocketOffers(seed: string, turn: number, rulesVersion: 1 | 2 = 1): PocketTile[] {
  let hash = pocketHash(`${seed}:offer:${turn}`);
  if (rulesVersion === 2) {
    // Avalanche all 32 seed bits before taking low bits; legacy FNV parity is preserved only for v1.
    hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
    hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
    hash = (hash ^ (hash >>> 16)) >>> 0;
  }
  const omitted = hash % 4;
  return POCKET_TILES.filter((_, i) => i !== omitted);
}
export function pocketNeighbors(cell: number): number[] { const row = Math.floor(cell / 5), col = cell % 5; return [row > 0 ? cell - 5 : -1, row < 3 ? cell + 5 : -1, col > 0 ? cell - 1 : -1, col < 4 ? cell + 1 : -1].filter(n => n >= 0); }
export function pocketRequests(seed: string) { const tile = POCKET_TILES[pocketHash(`${seed}:request`) % 4]; return [{ text: `Build at least 5 ${POCKET_LABELS[tile].toLowerCase()} plots`, tile, target: 5, bonus: 8 }, { text: 'Build at least 3 of every kind', tile: null, target: 3, bonus: 12 }]; }
function scoreLegacyPocketBoard(board: (PocketTile | null)[], seed: string) {
  let homes = 0, stalls = 0, parks = 0, paths = 0;
  const counts = { home: 0, stall: 0, park: 0, path: 0 };
  board.forEach((tile, cell) => {
    if (!tile) return;
    counts[tile]++;
    const neighbors = pocketNeighbors(cell).map(n => board[n]);
    if (tile === 'home') homes += neighbors.filter(n => n === 'park').length * 2;
    if (tile === 'stall') stalls += neighbors.filter(n => n === 'path').length * 2;
    if (tile === 'park') parks += pocketNeighbors(cell).filter(n => n > cell && board[n] === 'park').length;
    if (tile === 'path') paths += pocketNeighbors(cell).filter(n => n > cell && board[n] === 'path').length;
  });
  const requests = pocketRequests(seed).map(r => ({ ...r, current: r.tile ? counts[r.tile] : Math.min(...Object.values(counts)), complete: r.tile ? counts[r.tile] >= r.target : Object.values(counts).every(n => n >= r.target) }));
  const bonuses = requests.reduce((sum, r) => sum + (r.complete ? r.bonus : 0), 0);
  return { total: homes + stalls + parks + paths + bonuses, homes, stalls, parks, paths, bonuses, counts, requests };
}
export function createPocketRun(seed: string, mode: PocketMode, rulesVersion: 1 | 2 = 1): PocketRun {
  if (typeof seed !== 'string' || !/^[a-zA-Z0-9:_-]{1,100}$/.test(seed) || !['standard', 'daily', 'practice'].includes(mode)) throw new Error('Invalid run');
  if (rulesVersion !== 1 && rulesVersion !== 2) throw new Error('Unsupported rules');
  return { version: 1, ...(rulesVersion === 2 ? { rulesVersion: 2 as const } : {}), seed, mode, moves: [], board: Array(20).fill(null) };
}
export function placePocketTile(run: PocketRun, move: PocketMove): PocketRun {
  if (!Number.isInteger(move?.cell) || move.cell < 0 || move.cell >= 20 || !Number.isInteger(move.offer) || move.offer < 0 || move.offer > 2 || run.moves.length >= 20 || run.board[move.cell]) throw new Error('Choose an empty plot and an offered tile');
  const board = [...run.board]; board[move.cell] = pocketOffers(run.seed, run.moves.length, run.rulesVersion ?? 1)[move.offer];
  return { ...run, board, moves: [...run.moves, { cell: move.cell, offer: move.offer }] };
}
export function replayPocketRun(seed: string, mode: PocketMode, moves: PocketMove[], rulesVersion: 1 | 2 = 1): PocketRun {
  if (!Array.isArray(moves) || moves.length > 20) throw new Error('Invalid move history');
  return moves.reduce(placePocketTile, createPocketRun(seed, mode, rulesVersion));
}
export function validatePocketSave(value: unknown): PocketRun | null {
  try { if (!value || typeof value !== 'object') return null; const v = value as PocketRun; if (v.version !== 1 || (v.rulesVersion !== undefined && v.rulesVersion !== 2)) return null; return replayPocketRun(v.seed, v.mode, v.moves, v.rulesVersion ?? 1); } catch { return null; }
}

/** The west gate enters row 2, column 1. Only an unbroken path from this plot carries access. */
export const POCKET_GATE = 5;
export const POCKET_MEDALS = { bronze: 36, silver: 46, gold: 56 } as const;
export type PocketMedal = 'none' | keyof typeof POCKET_MEDALS;
export function pocketServices(board: (PocketTile | null)[]) {
  const connected = new Set<number>();
  if (board[POCKET_GATE] === 'path') {
    const queue = [POCKET_GATE]; connected.add(POCKET_GATE);
    for (let i = 0; i < queue.length; i++) for (const cell of pocketNeighbors(queue[i])) {
      if (board[cell] === 'path' && !connected.has(cell)) { connected.add(cell); queue.push(cell); }
    }
  }
  const happyHomes: number[] = [], openStalls: number[] = [], isolated: number[] = [];
  board.forEach((tile, cell) => {
    const neighbors = pocketNeighbors(cell);
    const access = neighbors.some(n => connected.has(n));
    if (tile === 'home') {
      if (access && neighbors.some(n => board[n] === 'park')) happyHomes.push(cell);
      else isolated.push(cell);
    }
  });
  board.forEach((tile, cell) => {
    if (tile === 'stall') {
      const neighbors = pocketNeighbors(cell);
      if (neighbors.some(n => connected.has(n)) && neighbors.some(n => happyHomes.includes(n))) openStalls.push(cell);
      else isolated.push(cell);
    }
  });
  return { connected: [...connected], happyHomes, openStalls, isolated: isolated.sort((a, b) => a - b) };
}
export function scorePocketBoard(board: (PocketTile | null)[], seed: string, rulesVersion: 1 | 2 = 1) {
  const services = pocketServices(board);
  if (rulesVersion === 1) {
    const legacy = scoreLegacyPocketBoard(board, seed);
    return { ...legacy, ...services, medal: 'none' as PocketMedal, won: false, charterComplete: false };
  }
  if (rulesVersion !== 2) throw new Error('Unsupported rules');
  const counts = { home: 0, stall: 0, park: 0, path: 0 };
  board.forEach(tile => { if (tile) counts[tile]++; });
  const homes = services.happyHomes.length * 6;
  const stalls = services.openStalls.length * 5;
  const paths = services.connected.length;
  let parks = 0;
  board.forEach((tile, cell) => { if (tile === 'park') parks += pocketNeighbors(cell).filter(n => n > cell && board[n] === 'park').length; });
  const total = homes + stalls + paths + parks;
  const requests = [
    { text: '4 happy homes', tile: 'home' as PocketTile, target: 4, bonus: 0, current: services.happyHomes.length, complete: services.happyHomes.length >= 4 },
    { text: '2 open food stalls', tile: 'stall' as PocketTile, target: 2, bonus: 0, current: services.openStalls.length, complete: services.openStalls.length >= 2 },
  ];
  const charterComplete = requests.every(r => r.complete);
  const medal: PocketMedal = !charterComplete || total < POCKET_MEDALS.bronze ? 'none' : total >= POCKET_MEDALS.gold ? 'gold' : total >= POCKET_MEDALS.silver ? 'silver' : 'bronze';
  return { total, homes, stalls, parks, paths, bonuses: 0, counts, requests, ...services, medal, charterComplete, won: medal !== 'none' };
}
