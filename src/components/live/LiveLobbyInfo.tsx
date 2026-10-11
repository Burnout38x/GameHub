import type { Room } from '@/lib/types';
import type { LiveType } from '@/lib/live/types';
import { MIXED, sectionById } from '@/lib/bowl/types';
import { MIXED_TOPIC, topicById } from '@/lib/dilemma/types';
import Link from 'next/link';

const RULES: Record<LiveType, { title: string; body: string; small: string }> = {
  bowl: {
    title: 'Fastest right answer wins',
    body: 'Everyone gets the same question at the same moment. A right answer scores 500 plus up to 500 for speed. Three in a row starts a streak bonus, and the final question counts double.',
    small: 'One 50/50 lifeline each per match. Questions climb from warm-up to champion.',
  },
  dilemma: {
    title: 'Be honest, then read the room',
    body: 'Each situation has four choices. Pick what you would really do, then predict the room’s favourite. Right predictions score 100.',
    small: 'Hot Seat mode: one player answers, everyone else guesses them. Picks stay secret until everyone has chosen.',
  },
  whot: {
    title: 'Empty your hand first',
    body: 'Match the top card’s shape or number. 1 Hold On, 2 Pick Two, 5 Pick Three, 8 Suspension, 14 General Market, 20 Whot (call any shape).',
    small: 'Can’t play? Go to market. If the market runs dry, lowest card total wins the tender (stars count double).',
  },
};

/** Lobby rules and the host’s choices for a live game. */
export default function LiveLobbyInfo({ type, room }: { type: LiveType; room: Room }) {
  const rules = RULES[type];
  const setup = (room.round_state?.setup ?? {}) as { section?: string; topic?: string };
  const section = setup.section && setup.section !== 'mixed' ? sectionById(setup.section) : MIXED;
  const topic = setup.topic && setup.topic !== 'mixed' ? topicById(setup.topic) : MIXED_TOPIC;
  return (
    <>
      <div className="glass-sm mt-4 p-4 text-left">
        <h2 className="font-bold">{rules.title}</h2>
        <p className="mt-2 text-sm text-white/70">{rules.body}</p>
        <p className="mt-2 text-xs text-white/60">{rules.small}</p>
        {type === 'whot' && <Link href="/play/whot" className="mt-3 inline-block text-sm font-bold text-indigo-200">Warm up against the Machine first →</Link>}
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
        {type === 'bowl' && section && <span className="pill">{section.emoji} {section.name}</span>}
        {type === 'bowl' && <span className="pill">{room.difficulty === 'easy' ? '🌱 Warm-up' : room.difficulty === 'hard' ? '🔥 Champions only' : '🏅 Full ladder'}</span>}
        {type === 'dilemma' && topic && <span className="pill">{topic.emoji} {topic.name}</span>}
        {type === 'dilemma' && <span className="pill">{room.mode === 'spotlight' ? '🔥 Hot Seat' : '👀 Read the Room'}</span>}
        <span className="pill">{type === 'whot' ? (room.total_rounds > 1 ? `Best of ${room.total_rounds} hands` : 'Single hand') : `${room.total_rounds} ${type === 'bowl' ? 'questions' : 'situations'}`}</span>
        {room.answer_seconds && <span className="pill">⏱ {room.answer_seconds}s {type === 'whot' ? 'per turn' : type === 'bowl' ? 'per question' : 'to choose'}</span>}
        <span className="pill">{room.is_public ? 'Public room' : 'Private room'}</span>
      </div>
    </>
  );
}
