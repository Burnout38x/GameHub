export const REPORT_KINDS = ['bug', 'player', 'feedback'] as const;
export type ReportKind = typeof REPORT_KINDS[number];
export type ReportStatus = 'open' | 'resolved';
export interface PlayerReport {
  id: string; reporter_id: string | null; kind: ReportKind; subject: string;
  description: string; game_name: string | null; room_code: string | null;
  status: ReportStatus; created_at: string; resolved_at: string | null;
}
export function validateReport(value: unknown) {
  if (!value || typeof value !== 'object') return { error: 'Enter your report details.' } as const;
  const body = value as Record<string, unknown>;
  const text = (key: string) => typeof body[key] === 'string' ? (body[key] as string).trim() : '';
  const kind = text('kind');
  const subject = text('subject');
  const description = text('description');
  const gameName = text('gameName');
  const roomCode = text('roomCode').toUpperCase();
  if (!REPORT_KINDS.includes(kind as ReportKind)) return { error: 'Choose a report type.' } as const;
  if (subject.length < 5 || subject.length > 120) return { error: 'Use 5–120 characters for the summary.' } as const;
  if (description.length < 20 || description.length > 3000) return { error: 'Use 20–3,000 characters for the details.' } as const;
  if (gameName.length > 100) return { error: 'Game name must be 100 characters or fewer.' } as const;
  if (roomCode && !/^[A-Z2-9]{6}$/.test(roomCode)) return { error: 'Room codes contain 6 letters or numbers.' } as const;
  return { data: { kind: kind as ReportKind, subject, description, gameName: gameName || null, roomCode: roomCode || null } } as const;
}
