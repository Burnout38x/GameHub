export const GAME_CATEGORIES = [
  { id: 'trivia', label: 'Trivia & knowledge' },
  { id: 'words', label: 'Words & riddles' },
  { id: 'logic', label: 'Logic & numbers' },
  { id: 'conversation', label: 'Conversation' },
  { id: 'couples', label: 'Couples & connection' },
  { id: 'party', label: 'Party challenges' },
  { id: 'strategy', label: 'Build & strategy' },
  { id: 'memory', label: 'Memory' },
] as const;
export type GameCategory = typeof GAME_CATEGORIES[number]['id'];
export type GameAudience = 'all' | 'couples' | 'groups' | 'family';
export type GameMode = 'all' | 'online' | 'local' | 'solo';
export type LibraryGame = { slug: string; name: string; description: string; type?: string };
export type LibraryFilters = { search: string; category: GameCategory | 'all'; audience: GameAudience; mode: GameMode };

// Categories describe play, rather than the engine used to run a game.
// Family picks are a narrow set of puzzles; conversation banks are not age-rated.
const taxonomy: Record<string, { category: GameCategory; audiences: GameAudience[] }> = {
  'pocket-paradise': { category: 'strategy', audiences: ['family', 'groups', 'couples'] },
  'market-day': { category: 'strategy', audiences: ['family', 'groups', 'couples'] },
  'fortress-feud': { category: 'strategy', audiences: ['family', 'groups', 'couples'] },
  'brain-bowl': { category: 'trivia', audiences: ['groups', 'couples', 'family'] },
  'what-would-you-do': { category: 'conversation', audiences: ['groups', 'couples'] },
  whot: { category: 'strategy', audiences: ['family', 'groups', 'couples'] },
  'doctor-dash': { category: 'trivia', audiences: ['groups', 'couples'] },
  'riddle-rush': { category: 'words', audiences: ['groups', 'couples'] },
  'emoji-movie': { category: 'trivia', audiences: ['groups', 'couples'] },
  'movie-trivia': { category: 'trivia', audiences: ['groups', 'couples'] },
  'never-have-i-ever': { category: 'conversation', audiences: ['groups', 'couples'] },
  'would-you-rather': { category: 'conversation', audiences: ['groups', 'couples'] },
  'truth-or-dare': { category: 'party', audiences: ['groups', 'couples'] },
  // Retired: merged into Truth or Dare as the After Dark vibe.
  'truth-or-dare-after-dark': { category: 'couples', audiences: ['couples', 'groups'] },
  'two-minute-challenge': { category: 'party', audiences: ['groups', 'couples'] },
  'memory-match': { category: 'memory', audiences: ['groups', 'couples', 'family'] },
  'number-guess': { category: 'logic', audiences: ['groups', 'couples', 'family'] },
  'mystery-card': { category: 'words', audiences: ['groups', 'couples', 'family'] },
  'reverse-definition': { category: 'words', audiences: ['groups', 'couples', 'family'] },
  'mental-math-duel': { category: 'logic', audiences: ['couples', 'family'] },
  'know-your-partner': { category: 'couples', audiences: ['couples'] },
  'who-remembers': { category: 'couples', audiences: ['couples'] },
  'code-crackers': { category: 'logic', audiences: ['groups', 'couples', 'family'] },
  'rule-discoverer': { category: 'logic', audiences: ['groups', 'couples', 'family'] },
  'word-chain': { category: 'words', audiences: ['groups', 'couples'] },
};
const engineCategories: Record<string, GameCategory> = { bowl: 'trivia', dilemma: 'conversation', whot: 'strategy', quiz: 'trivia', prompt: 'conversation', memory: 'memory', predict: 'couples', code: 'logic', rule: 'logic', chain: 'words', guess: 'logic' };
export function gameCategory(game: LibraryGame): GameCategory | undefined {
  return taxonomy[game.slug]?.category ?? engineCategories[game.type ?? ''];
}
export function gameCategoryLabel(game: LibraryGame): string {
  return GAME_CATEGORIES.find(category => category.id === gameCategory(game))?.label ?? 'More games';
}
export function matchesGame(game: LibraryGame, filters: LibraryFilters, mode: Exclude<GameMode, 'all'>): boolean {
  if (filters.mode !== 'all' && filters.mode !== mode) return false;
  if (filters.category !== 'all' && gameCategory(game) !== filters.category) return false;
  if (filters.audience !== 'all' && !taxonomy[game.slug]?.audiences.includes(filters.audience)) return false;
  const terms = filters.search.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const text = `${game.name} ${game.description} ${gameCategoryLabel(game)}`.toLocaleLowerCase();
  return terms.every(term => text.includes(term));
}
