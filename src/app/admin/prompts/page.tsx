'use client';
import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Game, Prompt } from '@/lib/types';

export default function AdminPromptsPage() {
  const supabase = createClient();
  const [games, setGames] = useState<Game[]>([]);
  const [gameId, setGameId] = useState('');
  const [difficulty, setDifficulty] = useState<'all' | 'easy' | 'hard'>('all');
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState<'add' | 'bulk'>('add');

  const game = games.find((g) => g.id === gameId);
  const isQuiz = game?.type === 'quiz';

  // add form
  const [f, setF] = useState({
    difficulty: 'easy',
    question: '',
    answer: '',
    wrong1: '',
    wrong2: '',
    wrong3: '',
    emoji: '',
    hint: '',
    fact: '',
    text: '',
    category: '',
  });
  const [bulk, setBulk] = useState('');

  function flash(m: string) {
    setMsg(m);
    setTimeout(() => setMsg(''), 3000);
  }

  useEffect(() => {
    supabase
      .from('games')
      .select('*')
      .in('type', ['quiz', 'prompt'])
      .order('sort_order')
      .then(({ data }) => {
        setGames((data as Game[]) ?? []);
        if (data?.[0]) setGameId(data[0].id);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(async () => {
    if (!gameId) return;
    let q = supabase.from('prompts').select('*').eq('game_id', gameId).order('created_at', { ascending: false });
    if (difficulty !== 'all') q = q.eq('difficulty', difficulty);
    const { data } = await q;
    setPrompts((data as Prompt[]) ?? []);
  }, [gameId, difficulty, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function addPrompt(e: React.FormEvent) {
    e.preventDefault();
    if (!game) return;
    let content: Record<string, any>;
    if (isQuiz) {
      if (!f.question || !f.answer || !f.wrong1) return flash('Question, answer and at least 1 wrong option required');
      content = {
        question: f.question.trim(),
        answer: f.answer.trim(),
        options: [f.answer, f.wrong1, f.wrong2, f.wrong3].map((s) => s.trim()).filter(Boolean),
      };
      if (f.emoji.trim()) content.emoji = f.emoji.trim();
      if (f.hint.trim()) content.hint = f.hint.trim();
      if (f.fact.trim()) content.fact = f.fact.trim();
    } else {
      if (!f.text) return flash('Prompt text required');
      content = { text: f.text.trim(), category: f.category.trim() || game.name };
    }
    const { error } = await supabase.from('prompts').insert({ game_id: game.id, difficulty: f.difficulty, content });
    if (error) return flash(`Error: ${error.message}`);
    flash('Prompt added ✔');
    setF({ ...f, question: '', answer: '', wrong1: '', wrong2: '', wrong3: '', emoji: '', hint: '', fact: '', text: '' });
    load();
  }

  async function bulkImport() {
    if (!game) return;
    let items: any[];
    try {
      items = JSON.parse(bulk);
      if (!Array.isArray(items)) throw new Error();
    } catch {
      return flash('Paste a JSON array, e.g. [{"difficulty":"easy","question":"...","answer":"...","options":["..."]}]');
    }
    const rows = items.map((item) => {
      const { difficulty: d, ...content } = item;
      return { game_id: game.id, difficulty: d === 'hard' ? 'hard' : 'easy', content };
    });
    const bad = rows.find(
      (r) => (isQuiz && (!r.content.question || !r.content.answer || !Array.isArray(r.content.options))) || (!isQuiz && !r.content.text)
    );
    if (bad) return flash(`An item is missing required fields (${isQuiz ? 'question/answer/options' : 'text'})`);
    const { error } = await supabase.from('prompts').insert(rows);
    if (error) return flash(`Error: ${error.message}`);
    flash(`Imported ${rows.length} prompts ✔`);
    setBulk('');
    load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from('prompts').delete().eq('id', id);
    flash(error ? `Error: ${error.message}` : 'Deleted');
    load();
  }

  async function setPromptDifficulty(p: Prompt, d: 'easy' | 'hard') {
    await supabase.from('prompts').update({ difficulty: d }).eq('id', p.id);
    load();
  }

  return (
    <div className="flex flex-col gap-4">
      {msg && <div className="glass-sm p-3 text-sm font-bold text-indigo-200">{msg}</div>}

      <div className="flex flex-wrap gap-3">
        <select className="input !w-auto" value={gameId} onChange={(e) => setGameId(e.target.value)}>
          {games.map((g) => (
            <option key={g.id} value={g.id}>
              {g.emoji} {g.name}
            </option>
          ))}
        </select>
        <select className="input !w-auto" value={difficulty} onChange={(e) => setDifficulty(e.target.value as any)}>
          <option value="all">All difficulties</option>
          <option value="easy">😌 Easy only</option>
          <option value="hard">🔥 Hard only</option>
        </select>
        <div className="pill self-center">{prompts.length} prompts shown</div>
      </div>

      <div className="glass p-6">
        <div className="flex gap-2">
          <button className={`pill ${tab === 'add' ? '!bg-white/20' : ''}`} onClick={() => setTab('add')}>➕ Add one</button>
          <button className={`pill ${tab === 'bulk' ? '!bg-white/20' : ''}`} onClick={() => setTab('bulk')}>📦 Bulk import (JSON)</button>
        </div>

        {tab === 'add' ? (
          <form onSubmit={addPrompt} className="mt-2">
            <label className="field-label">Difficulty</label>
            <select className="input" value={f.difficulty} onChange={(e) => setF({ ...f, difficulty: e.target.value })}>
              <option value="easy">😌 Easy</option>
              <option value="hard">🔥 Hard</option>
            </select>
            {isQuiz ? (
              <>
                <label className="field-label">Question</label>
                <input className="input" value={f.question} onChange={(e) => setF({ ...f, question: e.target.value })} />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="field-label">✅ Correct answer</label>
                    <input className="input" value={f.answer} onChange={(e) => setF({ ...f, answer: e.target.value })} />
                  </div>
                  <div>
                    <label className="field-label">❌ Wrong option 1</label>
                    <input className="input" value={f.wrong1} onChange={(e) => setF({ ...f, wrong1: e.target.value })} />
                  </div>
                  <div>
                    <label className="field-label">❌ Wrong option 2</label>
                    <input className="input" value={f.wrong2} onChange={(e) => setF({ ...f, wrong2: e.target.value })} />
                  </div>
                  <div>
                    <label className="field-label">❌ Wrong option 3</label>
                    <input className="input" value={f.wrong3} onChange={(e) => setF({ ...f, wrong3: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="field-label">Emoji (optional, for emoji games)</label>
                    <input className="input" value={f.emoji} onChange={(e) => setF({ ...f, emoji: e.target.value })} />
                  </div>
                  <div>
                    <label className="field-label">Hint (optional)</label>
                    <input className="input" value={f.hint} onChange={(e) => setF({ ...f, hint: e.target.value })} />
                  </div>
                  <div>
                    <label className="field-label">Fun fact (optional)</label>
                    <input className="input" value={f.fact} onChange={(e) => setF({ ...f, fact: e.target.value })} />
                  </div>
                </div>
              </>
            ) : (
              <>
                <label className="field-label">Prompt text</label>
                <textarea className="input min-h-20" value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} />
                <label className="field-label">Category</label>
                <input className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} placeholder="e.g. Funny" />
              </>
            )}
            <button className="btn mt-5 !w-auto px-8">Add prompt</button>
          </form>
        ) : (
          <div className="mt-2">
            <p className="mt-2 text-sm text-white/60">
              Paste a JSON array. Each item: <code className="text-indigo-300">{isQuiz ? '{"difficulty":"easy","question":"…","answer":"…","options":["…","…"]}' : '{"difficulty":"easy","text":"…","category":"…"}'}</code>
            </p>
            <textarea className="input mt-3 min-h-40 font-mono text-xs" value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder="[ … ]" />
            <button className="btn mt-4 !w-auto px-8" onClick={bulkImport}>Import</button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {prompts.map((p) => (
          <div key={p.id} className="glass-sm flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold">
                {p.content.emoji ? `${p.content.emoji} ` : ''}
                {p.content.question ?? p.content.text}
              </div>
              <div className="text-xs text-white/50">
                {p.content.answer ? `Answer: ${p.content.answer}` : (p.content.category ?? '')}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                className={`pill !py-1 text-xs ${p.difficulty === 'easy' ? '!bg-emerald-400/20 !text-emerald-200' : '!bg-orange-400/20 !text-orange-200'}`}
                title="Click to toggle difficulty"
                onClick={() => setPromptDifficulty(p, p.difficulty === 'easy' ? 'hard' : 'easy')}
              >
                {p.difficulty === 'easy' ? '😌 easy' : '🔥 hard'}
              </button>
              <button className="pill !py-1 text-xs !text-red-300" onClick={() => remove(p.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
        {prompts.length === 0 && <div className="glass-sm p-6 text-center text-white/50">No prompts yet for this filter.</div>}
      </div>
    </div>
  );
}
