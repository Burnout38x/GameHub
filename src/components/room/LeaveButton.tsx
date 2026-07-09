'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { callRoomApi } from './RoomClient';
import type { RoomStatus } from '@/lib/types';

export default function LeaveButton({
  code,
  status,
  isHost,
}: {
  code: string;
  status: RoomStatus;
  isHost: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function leave() {
    if (status === 'playing' && !confirm("Leave the game? You can't rejoin once it started.")) return;
    if (status === 'lobby' && isHost && !confirm('Close the room for everyone?')) return;
    setBusy(true);
    try {
      await callRoomApi(code, 'leave');
      router.push('/games');
      router.refresh();
    } catch {
      setBusy(false);
    }
  }

  return (
    <button className="btn-danger" disabled={busy} onClick={leave}>
      {status === 'lobby' && isHost ? 'Close room ✖' : 'Leave room 🚪'}
    </button>
  );
}
