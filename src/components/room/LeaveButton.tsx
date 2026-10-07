'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { callRoomApi } from '@/lib/room-api';
import type { RoomStatus } from '@/lib/types';

export default function LeaveButton({
  code,
  status,
  isHost,
  endsMatch = false,
}: {
  code: string;
  status: RoomStatus;
  isHost: boolean;
  endsMatch?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function leave() {
    if (status === 'playing' && !confirm(endsMatch ? "End this Market Day for everyone? No result will be recorded. To take a break and return, close this tab instead." : "Leave the game? You can't rejoin once it started.")) return;
    if (status === 'lobby' && isHost && !confirm('Close the room for everyone?')) return;
    setBusy(true);
    setError('');
    try {
      await callRoomApi(code, 'leave');
      router.push('/games');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not leave the room. Please try again.');
      setBusy(false);
    }
  }

  return (
    <div>{error && <p role="alert" className="mb-3 text-sm text-red-300">{error}</p>}<button className="btn-danger" disabled={busy} onClick={leave}>
      {busy ? 'Leaving…' : status === 'lobby' && isHost ? 'Close room ✖' : 'Leave room 🚪'}
    </button></div>
  );
}
