'use client';
import type { LiveType } from '@/lib/live/types';
import { MIXED, SECTIONS } from '@/lib/bowl/types';
import { MIXED_TOPIC, TOPICS } from '@/lib/dilemma/types';

/** Room-creation choices for the live games: section, topic, mode, length and pace. */
export interface LiveOptions { section: string; topic: string; mode: 'classic' | 'spotlight'; rounds: string; seconds: string; difficulty: 'easy' | 'mixed' | 'hard' }

const ROUNDS: Record<LiveType, { label: string; options: string[]; fallback: string }> = {
  bowl: { label: 'Questions', options: ['8', '12', '16', '20', '30'], fallback: '12' },
  dilemma: { label: 'Situations', options: ['6', '10', '15', '20'], fallback: '10' },
  whot: { label: 'Match length', options: ['1', '3', '5'], fallback: '3' },
};
const SECONDS: Record<LiveType, { label: string; options: string[]; fallback: string }> = {
  bowl: { label: 'Time per question', options: ['10', '15', '20', '30'], fallback: '20' },
  dilemma: { label: 'Time to choose', options: ['30', '45', '60', '90'], fallback: '45' },
  whot: { label: 'Time per turn', options: ['20', '30', '45'], fallback: '30' },
};

export const defaultLiveOptions = (): LiveOptions => ({ section: 'mixed', topic: 'mixed', mode: 'classic', rounds: '', seconds: '', difficulty: 'mixed' });

/** What the create-room request sends for a live game. */
export function liveRequest(type: LiveType, options: LiveOptions) {
  const rounds = ROUNDS[type].options.includes(options.rounds) ? options.rounds : ROUNDS[type].fallback;
  const seconds = SECONDS[type].options.includes(options.seconds) ? options.seconds : SECONDS[type].fallback;
  return {
    totalRounds: Number(rounds),
    answerSeconds: Number(seconds),
    mode: type === 'dilemma' ? options.mode : 'classic',
    difficulty: type === 'bowl' ? options.difficulty : 'mixed',
    setup: type === 'bowl' ? { section: options.section } : type === 'dilemma' ? { topic: options.topic } : {},
  };
}

export const LIVE_PLAYER_NOTE: Record<LiveType, string> = {
  bowl: 'Play solo or with up to 9 friends. Everyone answers on their own phone; the fastest right answers win.',
  dilemma: 'For 2–10 players. Everyone picks secretly, then the room argues about the reveal.',
  whot: 'For 2–4 players. Your cards stay on your phone; the table is shared.',
};

export default function LiveRoomOptions({ type, value, onChange }: { type: LiveType; value: LiveOptions; onChange: (next: LiveOptions) => void }) {
  const set = (patch: Partial<LiveOptions>) => onChange({ ...value, ...patch });
  const request = liveRequest(type, value);
  return (
    <>
      <p className="mt-2 text-xs text-indigo-200">{LIVE_PLAYER_NOTE[type]}</p>
      {type === 'bowl' && <>
        <label className="field-label" htmlFor="section">Section</label>
        <select id="section" className="input" value={value.section} onChange={event => set({ section: event.target.value })}>
          <option value="mixed">{MIXED.emoji} {MIXED.name}</option>
          {SECTIONS.map(section => <option key={section.id} value={section.id}>{section.emoji} {section.name}</option>)}
        </select>
        <label className="field-label" htmlFor="difficulty">Level</label>
        <select id="difficulty" className="input" value={value.difficulty} onChange={event => set({ difficulty: event.target.value as LiveOptions['difficulty'] })}>
          <option value="easy">🌱 Warm-up — fun for everyone</option>
          <option value="mixed">🏅 Full ladder — warm-up to champion</option>
          <option value="hard">🔥 Champions only — the hardest questions</option>
        </select>
      </>}
      {type === 'dilemma' && <>
        <label className="field-label" htmlFor="topic">Topic</label>
        <select id="topic" className="input" value={value.topic} onChange={event => set({ topic: event.target.value })}>
          <option value="mixed">{MIXED_TOPIC.emoji} {MIXED_TOPIC.name}</option>
          {TOPICS.map(topic => <option key={topic.id} value={topic.id}>{topic.emoji} {topic.name}</option>)}
        </select>
        <label className="field-label" htmlFor="mode">Mode</label>
        <select id="mode" className="input" value={value.mode} onChange={event => set({ mode: event.target.value === 'spotlight' ? 'spotlight' : 'classic' })}>
          <option value="classic">👀 Read the Room — predict the favourite answer</option>
          <option value="spotlight">🔥 Hot Seat — guess what one friend would do</option>
        </select>
        {value.mode === 'spotlight' && <p className="mt-2 text-xs text-white/60">Rounds are evened out so everyone takes the same number of turns in the hot seat.</p>}
      </>}
      <label className="field-label" htmlFor="rounds">{ROUNDS[type].label}</label>
      <select id="rounds" className="input" value={String(request.totalRounds)} onChange={event => set({ rounds: event.target.value })}>
        {ROUNDS[type].options.map(option => <option key={option} value={option}>{type === 'whot' ? (option === '1' ? 'Single hand' : `Best of ${option} hands`) : option}</option>)}
      </select>
      <label className="field-label" htmlFor="timer">{SECONDS[type].label}</label>
      <select id="timer" className="input" value={String(request.answerSeconds)} onChange={event => set({ seconds: event.target.value })}>
        {SECONDS[type].options.map(option => <option key={option} value={option}>⏱ {option} seconds</option>)}
      </select>
      <p className="mt-2 text-xs text-white/50">{type === 'whot' ? 'Run out of time and you go to market automatically.' : 'The server keeps time for everyone.'}</p>
    </>
  );
}
