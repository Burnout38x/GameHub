export const POCKET_TILES = ['home', 'stall', 'park', 'path'] as const;
export type PocketTile = typeof POCKET_TILES[number];
export type PocketMode = 'standard' | 'daily' | 'practice';
export type PocketMove = { cell: number; offer: number };
export type PocketRun = { version: 1; seed: string; mode: PocketMode; moves: PocketMove[]; board: (PocketTile | null)[] };
export const POCKET_LABELS: Record<PocketTile, string> = { home: 'Home', stall: 'Food stall', park: 'Park', path: 'Path' };
export function pocketHash(value: string): number { let h = 2166136261; for (const c of value) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
export function pocketOffers(seed: string, turn: number): PocketTile[] {
  const omitted = pocketHash(`${seed}:offer:${turn}`) % 4;
  return POCKET_TILES.filter((_, i) => i !== omitted);
}
export function pocketNeighbors(cell: number): number[] { const row = Math.floor(cell / 5), col = cell % 5; return [row > 0 ? cell - 5 : -1, row < 3 ? cell + 5 : -1, col > 0 ? cell - 1 : -1, col < 4 ? cell + 1 : -1].filter(n => n >= 0); }
export function pocketRequests(seed: string) { const tile = POCKET_TILES[pocketHash(`${seed}:request`) % 4]; return [{ text: `Build at least 5 ${POCKET_LABELS[tile].toLowerCase()} plots`, tile, target: 5, bonus: 8 }, { text: 'Build at least 3 of every kind', tile: null, target: 3, bonus: 12 }]; }
export function scorePocketBoard(board: (PocketTile | null)[], seed: string) {
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
export function createPocketRun(seed: string, mode: PocketMode): PocketRun {
  if (typeof seed !== 'string' || !/^[a-zA-Z0-9:_-]{1,100}$/.test(seed) || !['standard', 'daily', 'practice'].includes(mode)) throw new Error('Invalid run');
  return { version: 1, seed, mode, moves: [], board: Array(20).fill(null) };
}
export function placePocketTile(run: PocketRun, move: PocketMove): PocketRun {
  if (!Number.isInteger(move?.cell) || move.cell < 0 || move.cell >= 20 || !Number.isInteger(move.offer) || move.offer < 0 || move.offer > 2 || run.moves.length >= 20 || run.board[move.cell]) throw new Error('Choose an empty plot and an offered tile');
  const board = [...run.board]; board[move.cell] = pocketOffers(run.seed, run.moves.length)[move.offer];
  return { ...run, board, moves: [...run.moves, { cell: move.cell, offer: move.offer }] };
}
export function replayPocketRun(seed: string, mode: PocketMode, moves: PocketMove[]): PocketRun {
  if (!Array.isArray(moves) || moves.length > 20) throw new Error('Invalid move history');
  return moves.reduce(placePocketTile, createPocketRun(seed, mode));
}
export function validatePocketSave(value: unknown): PocketRun | null {
  try { if (!value || typeof value !== 'object') return null; const v = value as PocketRun; if (v.version !== 1) return null; return replayPocketRun(v.seed, v.mode, v.moves); } catch { return null; }
}
