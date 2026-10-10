'use client';
import Link from 'next/link';
import { useState } from 'react';
import type { RoomBundle } from './RoomClient';
import { callRoomApi } from '@/lib/room-api';
import LeaveButton from './LeaveButton';
import RoomFriendsInvite from '@/components/social/RoomFriendsInvite';
import { TRUTH_OR_DARE_VIBES } from '@/lib/truth-or-dare';
import { roomCapacity } from '@/lib/game-utils';
import { BATTLE_DIFFICULTY_LABELS } from '@/lib/fortress/rooms';

export default function Lobby(props: RoomBundle & { code: string; inRoom: boolean }) {
  const { room, game, players, userId, code, inRoom, refresh } = props;
  const isHost = room.host_id === userId;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copyMessage, setCopyMessage] = useState('');
  const isPredict = game.type === 'predict';
  const isBattle = game.type === 'battle';
  const exactlyTwo = isPredict || isBattle;
  const needsPartner = isPredict || game.type === 'market' || game.type === 'rule' || game.type === 'chain';
  const canStart = exactlyTwo ? players.length === 2 : players.length >= (needsPartner ? 2 : 1);
  const capacity = roomCapacity(game.type);
  const countLabel = game.type === 'memory' ? 'pairs'
    : game.type === 'code' ? 'codes'
    : game.type === 'rule' ? 'rules'
    : game.type === 'chain' ? 'turns'
    : ['quiz', 'survey', 'predict'].includes(game.type) ? 'questions' : 'rounds';

  async function act(action: string) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await callRoomApi(code, action);
      refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function copyCode() {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(code);
      setCopyMessage('Room code copied. Share it with your people!');
    } catch {
      setCopyMessage('Copy isn’t available here. Select the code above and copy it manually.');
    }
  }

  return (
    <div className="mx-auto mt-6 flex w-full max-w-xl flex-col gap-4">
      <section className="glass p-5 text-center sm:p-7" aria-labelledby="lobby-title">
        <p className="text-xs font-bold uppercase tracking-widest text-indigo-200">Game night starts here</p>
        <h1 id="lobby-title" className="mt-3 text-3xl font-black tracking-tight">{game.emoji} {game.name}</h1>
        <p className="mt-2 text-sm text-white/65">{game.description}</p>
        {game.type === 'market' && <div className="glass-sm mt-4 p-4 text-left">
          <h2 className="font-bold">Your goal: finish with the most prosperity</h2>
          <p className="mt-2 text-sm text-white/70">Buy businesses, build district sets and fulfill shared contracts before your rivals. Trade to complete a set or secure supplies. Everyone gets ten turns; equal final scores share the win.</p>
          <p className="mt-2 text-xs text-white/60">Each turn: choose a route, take one business action, then trade or finish. First player rotates each round. Nobody is eliminated.</p>
        </div>}
        {isBattle && <div className="glass-sm mt-4 p-4 text-left">
          <h2 className="font-bold">{room.mode === 'coop' ? 'Team up and topple the Machine' : 'Smash your rival’s keep'}</h2>
          <p className="mt-2 text-sm text-white/70">{room.mode === 'coop' ? 'Build one fortress together from timber, stone and steel, then take turns launching at the Machine’s.' : 'Each of you builds a fortress from timber, stone and steel in secret, then you take turns launching at each other.'} Drag back to aim, let go to fire, and knock out the enemy King and Knights.</p>
          <p className="mt-2 text-xs text-white/60">45 seconds a turn and 10 shots each. Gold buys ammo; elixir builds up for Barrages and Titan Boulders. Leaving a duel after both sides have fired counts as a loss.</p>
          <Link href="/play/fortress-feud" className="mt-3 inline-block text-sm font-bold text-indigo-200">Practice against the Machine first →</Link>
        </div>}
        <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
          {isBattle ? <span className="pill">{room.mode === 'coop' ? `🤝 Co-op vs Machine · ${BATTLE_DIFFICULTY_LABELS[room.difficulty].split(' — ')[0]}` : '⚔️ 1v1 Duel'}</span> : <span className="pill">{room.total_rounds} {countLabel}</span>}
          {game.config?.pickTruthOrDare && <span className="pill">{TRUTH_OR_DARE_VIBES[room.difficulty]?.short ?? 'Classic'}</span>}
          <span className="pill">{room.is_public ? 'Public room' : 'Private room'}</span>
          {room.mode === 'spotlight' && <span className="pill">Spotlight mode</span>}
          {['quiz', 'code'].includes(game.type) && <span className="pill">{game.type === 'code' ? `Code length: ${room.difficulty === 'easy' ? 4 : room.difficulty === 'hard' ? 6 : 5} digits` : `${room.difficulty} difficulty`}</span>}
          {['quiz', 'chain'].includes(game.type) && <span className="pill">{room.answer_seconds ? `${room.answer_seconds}s timer` : 'No timer'}</span>}
        </div>
        <h2 className="mt-6 text-sm font-bold text-white/70">Invite with your room code</h2>
        <button
          type="button"
          className="mx-auto mt-3 block max-w-full select-text rounded-2xl border border-white/[0.14] bg-black/[0.25] px-4 py-4 font-mono text-3xl font-black tracking-[0.15em] text-indigo-200 sm:px-8 sm:text-4xl sm:tracking-[0.3em]"
          onClick={copyCode}
          aria-label={`Copy room code ${code}`}
        >
          {code}
        </button>
        <p className="mt-2 text-sm text-white/65">Tap to copy. Your guests can enter it on Join a Room.</p>
        <p role="status" className="mt-2 text-sm text-indigo-200">{copyMessage}</p>
      </section>

      {inRoom && <RoomFriendsInvite code={code} />}
      <section className="glass p-5 sm:p-6" aria-labelledby="players-title" aria-busy={busy}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="players-title" className="text-lg font-black">Players <span className="text-white/60">{players.length}/{capacity}</span></h2>
          <span className="pill">Waiting room</span>
        </div>
        <p className="mt-1 text-sm text-white/65">
          {isBattle ? (room.mode === 'coop' ? 'Exactly two players, side by side against the Machine.' : 'Exactly two players. May the best fortress win.') : isPredict ? 'Exactly two players. You’ll take turns answering and predicting.' : needsPartner ? 'At least two players are needed to start.' : 'Invite your group or start a solo game.'}
        </p>
        {players.length === 0 && <p role="status" className="mt-4 text-sm text-white/65">No players have joined yet.</p>}
        <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {players.map((p) => (
            <li key={p.id} className="glass-sm flex min-w-0 items-center gap-3 px-4 py-3">
              <span aria-hidden="true" className="text-xl">{p.profile_id === room.host_id ? '👑' : '🎮'}</span>
              <div className="min-w-0">
                <span className="break-words font-bold">{p.display_name}</span>
                <p className="text-xs text-white/60">{p.profile_id === room.host_id ? 'Host' : 'Player'}{p.profile_id === userId ? ' · You' : ''}</p>
              </div>
            </li>
          ))}
        </ul>
        {error && <p role="alert" className="mt-3 text-sm font-bold text-red-300">{error}</p>}
        <div className="mt-5 flex flex-col gap-3">
          {!inRoom && (
            <button className="btn" disabled={busy || players.length >= capacity} onClick={() => act('join')}>
              {busy ? 'Joining…' : players.length >= capacity ? 'Room is full' : 'Join this room'}
            </button>
          )}
          {isHost && inRoom && (
            <button className="btn" disabled={busy || !canStart} onClick={() => act('start')}>
              {busy ? 'Starting…' : !canStart ? 'Waiting for a second player' : players.length === 1 ? 'Start solo game' : `Start with ${players.length} players`}
            </button>
          )}
          {!isHost && inRoom && <p role="status" className="text-center text-sm text-white/65">You’re in! Waiting for the host to start…</p>}
          {!inRoom && <Link href="/rooms" className="btn-secondary">Back to rooms</Link>}
          {inRoom && <LeaveButton code={code} status={room.status} isHost={isHost} />}
        </div>
      </section>
    </div>
  );
}
