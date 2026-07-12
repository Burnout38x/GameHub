'use client';
import { useState } from 'react';
import type { RoomBundle } from './RoomClient';
import { callRoomApi } from './RoomClient';

/** Rule Discoverer — test examples or identify the hidden rule. */
export default function RulePlay({ room, players, userId, refresh }: RoomBundle) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [input, setInput] = useState('');

  const state = room.round_state ?? {};
  const evidence: { value: string; accepted: boolean; system: boolean; by?: string }[] =
    state.evidence ?? [];
  const choices: { id: string; name: string; desc: string }[] = state.choices ?? [];
  const isMyTurn = room.turn_player_id === userId;
  const turnPlayer = players.find((p) => p.profile_id === room.turn_player_id);

  async function act(body: Record<string, any>) {
    setBusy(true);
    setError('');
    try {
      await callRoomApi(room.code, 'rule', body);
      setInput('');
      refresh();
    } catch (e: any) {
      setError(e.message);
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="pill">
          {isMyTurn ? '🎯 Your turn — test or guess' : `${turnPlayer?.display_name ?? '…'}'s turn`}
        </div>
        <div className="pill capitalize">
          🧩 {state.kind} rule · {(state.ruleRound ?? 0) + 1} of {room.total_rounds}
        </div>
      </div>

      {state.lastResult && (
        <div className="glass-sm p-4 text-center text-sm font-bold text-white/85">
          {state.lastResult.name} identified “{state.lastResult.ruleName}” (+{state.lastResult.points}) 🎉
        </div>
      )}
      {state.lastGuess && (
        <div className="glass-sm p-4 text-center text-sm font-bold text-amber-300">
          {state.lastGuess.name} guessed “{state.lastGuess.ruleName}” — wrong rule (−1).
        </div>
      )}

      <div className="glass flex flex-col items-center gap-4 p-6 text-center">
        <div className="text-xl font-black tracking-tight sm:text-2xl">Discover the hidden rule</div>
        <form
          className="flex w-full max-w-sm flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim()) act({ test: input });
          }}
        >
          <input
            className="input"
            autoComplete="off"
            maxLength={30}
            placeholder="Test a word or number"
            value={input}
            disabled={!isMyTurn || busy}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" className="btn-secondary !py-3" disabled={!isMyTurn || busy || !input.trim()}>
            Test example
          </button>
        </form>
        {error && <div className="text-sm font-bold text-red-300">{error}</div>}
      </div>

      <div className="glass p-5">
        <h2 className="text-lg font-black">💡 Or identify the rule (+5, wrong −1)</h2>
        <div className="mt-3 grid gap-2">
          {choices.map((c) => (
            <button
              key={c.id}
              className="option-btn"
              disabled={!isMyTurn || busy}
              onClick={() => act({ guessId: c.id })}
            >
              <strong>{c.name}</strong>
              <div className="mt-0.5 text-sm font-normal text-white/60">{c.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="glass p-5">
        <h2 className="text-lg font-black">Evidence</h2>
        <div className="mt-3 flex max-h-72 flex-col gap-2 overflow-y-auto">
          {evidence.map((e, i) => (
            <div key={i} className="glass-sm flex items-center justify-between gap-2 px-4 py-3 text-sm">
              <span className="font-bold">{e.value}</span>
              <span className="flex items-center gap-2">
                <span className={`font-black ${e.accepted ? 'text-emerald-300' : 'text-red-300'}`}>
                  {e.accepted ? 'Accepted' : 'Rejected'}
                </span>
                <span className="pill !px-2.5 !py-1 !text-[11px]">
                  {e.system ? 'starter clue' : e.by}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
