'use client';
import { useState } from 'react';
import type { RoomBundle } from './RoomClient';
import { callRoomApi } from './RoomClient';
import LeaveButton from './LeaveButton';

export default function Lobby(props: RoomBundle & { code: string; inRoom: boolean }) {
  const { room, game, players, userId, code, inRoom, refresh } = props;
  const isHost = room.host_id === userId;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  async function act(action: string) {
    setBusy(true);
    setError('');
    try {
      await callRoomApi(code, action);
      refresh();
    } catch (e: any) {
      setError(e.message);
    }
    setBusy(false);
  }

  return (
    <div className="mx-auto mt-6 flex w-full max-w-xl flex-col gap-4">
      <div className="glass p-7 text-center">
        <div className="pill mx-auto">
          {game.emoji} {game.name} · {room.difficulty} ·{' '}
          {game.type === 'memory' ? `${room.total_rounds} pairs` : `${room.total_rounds} rounds`}
          {room.mode === 'spotlight' ? ' · 🎯 spotlight' : ''}
          {room.is_public ? ' · 🌍 public' : ''}
        </div>
        <h1 className="mt-4 text-3xl font-black tracking-tight">Room Code</h1>
        <button
          className="mx-auto mt-3 block rounded-2xl border border-white/[0.14] bg-black/[0.25] px-8 py-4 font-mono text-4xl font-black tracking-[0.3em] text-indigo-200"
          onClick={() => {
            navigator.clipboard?.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
          title="Copy code"
        >
          {code}
        </button>
        <p className="mt-2 text-sm text-white/55">
          {copied ? 'Copied! ✔' : 'Tap the code to copy · share it with your player(s)'}
        </p>
      </div>

      <div className="glass p-6">
        <h2 className="text-lg font-black">Players ({players.length}/10)</h2>
        <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {players.map((p) => (
            <li key={p.id} className="glass-sm flex items-center gap-3 px-4 py-3">
              <span className="text-xl">{p.profile_id === room.host_id ? '👑' : '🎮'}</span>
              <span className="font-bold">{p.display_name}</span>
              {p.profile_id === userId && <span className="text-xs text-white/50">(you)</span>}
            </li>
          ))}
        </ul>
        {error && <p className="mt-3 text-sm font-bold text-red-300">{error}</p>}
        <div className="mt-5 flex flex-col gap-3">
          {!inRoom && (
            <button className="btn" disabled={busy} onClick={() => act('join')}>
              Join this room
            </button>
          )}
          {isHost && inRoom && (
            <button className="btn" disabled={busy || players.length < 1} onClick={() => act('start')}>
              {players.length < 2 ? 'Start solo game' : `Start with ${players.length} players`}
            </button>
          )}
          {!isHost && inRoom && (
            <p className="text-center text-sm text-white/55">Waiting for the host to start… ⏳</p>
          )}
          {inRoom && <LeaveButton code={code} status={room.status} isHost={isHost} />}
        </div>
      </div>
    </div>
  );
}
