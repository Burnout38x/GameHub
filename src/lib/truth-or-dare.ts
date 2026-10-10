/** Combined Truth or Dare: the turn player picks a kind, then the server deals a matching card. */
export type DareKind = 'truth' | 'dare';
export const DARE_KINDS: readonly DareKind[] = ['truth', 'dare'];

/** Room difficulty doubles as the deck choice. */
export const TRUTH_OR_DARE_VIBES = {
  easy: { label: '😇 Classic — fun for everyone', short: 'Classic', adults: false },
  hard: { label: '🌙 After Dark — flirty, for adults (18+)', short: 'After Dark 18+', adults: true },
  mixed: { label: '🎲 Mixed — both decks (18+)', short: 'Mixed 18+', adults: true },
} as const;

/** Points for a completed card: dares are the braver choice and score double. */
export const pickPoints = (kind: DareKind): number => (kind === 'dare' ? 2 : 1);

export function promptKind(content: Record<string, unknown> | null | undefined): DareKind {
  if (content?.kind === 'truth' || content?.kind === 'dare') return content.kind;
  const label = `${content?.category ?? content?.text ?? ''}`;
  return /^dare/i.test(label) ? 'dare' : 'truth';
}

/** Drops the "Truth:" / "Dare:" prefix, which the card header already shows. */
export function cardText(text: unknown): string {
  return typeof text === 'string' ? text.replace(/^(truth|dare)\s*:\s*/i, '') : '';
}

export interface PickDeal { promptIds: string[]; reserve: string[]; fallback: boolean }

/**
 * Moves the first unplayed card of the wanted kind into the current round.
 * Upcoming round cards are searched first, then the reserve; if that kind has
 * run out, the current card stays and `fallback` explains the switch.
 */
export function dealPick(promptIds: readonly string[], round: number, reserve: readonly string[], kinds: ReadonlyMap<string, DareKind>, want: DareKind): PickDeal {
  const ids = [...promptIds];
  const spare = [...reserve];
  const upcoming = ids.findIndex((id, index) => index >= round && kinds.get(id) === want);
  if (upcoming === round) return { promptIds: ids, reserve: spare, fallback: false };
  if (upcoming > round) {
    [ids[round], ids[upcoming]] = [ids[upcoming], ids[round]];
    return { promptIds: ids, reserve: spare, fallback: false };
  }
  const spareIndex = spare.findIndex(id => kinds.get(id) === want);
  if (spareIndex < 0) return { promptIds: ids, reserve: spare, fallback: true };
  [ids[round], spare[spareIndex]] = [spare[spareIndex], ids[round]];
  return { promptIds: ids, reserve: spare, fallback: false };
}

export const hasPicked = (roundState: Record<string, any> | null | undefined, round: number): boolean =>
  roundState?.pick?.round === round && DARE_KINDS.includes(roundState.pick.kind);
