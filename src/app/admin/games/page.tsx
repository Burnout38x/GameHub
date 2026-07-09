'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Game } from '@/lib/types';

const NEW_GAME_TEMPLATES: Record<string, { config: any; help: string }> = {
  quiz: {
    config: {},
    help: 'Players all answer multiple-choice questions at once. Add prompts with question/answer/options.',
  },
  prompt: {
    config: { choices: ['Option A', 'Option B'] },
    help: 'A prompt is shown with 2 reaction buttons. Set "scoreChoice" in config to award a point for one of them, or "countLabel" to count picks.',
  },
};

export default function AdminGamesPage() {
  const supabase = createClient();
  const [games, setGames] = useState<Game[]>([]);
  const [msg, setMsg] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: '', emoji: '🎲', description: '', type: 'quiz', config: '{}' });

  async function load() {
    const { data } = await supabase.from('games').select('*').order('sort_order');
    setGames((data as Game[]) ?? []);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function flash(m: string) {
    setMsg(m);
    setTimeout(() => setMsg(''), 2500);
  }

  async function toggleActive(g: Game) {
    const { error } = await supabase.from('games').update({ is_active: !g.is_active }).eq('id', g.id);
    flash(error ? `Error: ${error.message}` : `${g.name} is now ${g.is_active ? 'hidden' : 'live'}`);
    load();
  }

  async function saveEdit(g: Game, patch: Partial<Game>) {
    const { error } = await supabase.from('games').update(patch).eq('id', g.id);
    flash(error ? `Error: ${error.message}` : 'Saved ✔');
    load();
  }

  async function createGame(e: React.FormEvent) {
    e.preventDefault();
    let config: any;
    try {
      config = JSON.parse(form.config || '{}');
    } catch {
      return flash('Config must be valid JSON');
    }
    const slug = form.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!slug) return flash('Name required');
    const { error } = await supabase.from('games').insert({
      slug,
      name: form.name.trim(),
      emoji: form.emoji || '🎲',
      description: form.description.trim(),
      type: form.type,
      config,
      sort_order: 200,
    });
    if (error) return flash(`Error: ${error.message}`);
    flash(`Created "${form.name}" — now add prompts for it!`);
    setShowNew(false);
    setForm({ name: '', emoji: '🎲', description: '', type: 'quiz', config: '{}' });
    load();
  }

  return (
    <div className="flex flex-col gap-4">
      {msg && <div className="glass-sm p-3 text-sm font-bold text-indigo-200">{msg}</div>}

      <button className="btn !w-auto self-start px-6" onClick={() => setShowNew(!showNew)}>
        {showNew ? 'Cancel' : '➕ Create a new game'}
      </button>

      {showNew && (
        <form onSubmit={createGame} className="glass p-6">
          <h2 className="text-xl font-black">New Game</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="field-label">Name</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Bible Trivia" required />
            </div>
            <div>
              <label className="field-label">Emoji</label>
              <input className="input" value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} maxLength={4} />
            </div>
          </div>
          <label className="field-label">Description</label>
          <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <label className="field-label">Type</label>
          <select
            className="input"
            value={form.type}
            onChange={(e) =>
              setForm({
                ...form,
                type: e.target.value,
                config: JSON.stringify(NEW_GAME_TEMPLATES[e.target.value]?.config ?? {}, null, 2),
              })
            }
          >
            <option value="quiz">Quiz (multiple choice)</option>
            <option value="prompt">Prompt (2 reaction buttons)</option>
          </select>
          <p className="mt-2 text-xs text-white/55">{NEW_GAME_TEMPLATES[form.type]?.help}</p>
          <label className="field-label">Config (JSON)</label>
          <textarea className="input min-h-24 font-mono text-sm" value={form.config} onChange={(e) => setForm({ ...form, config: e.target.value })} />
          <button className="btn mt-5">Create game</button>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {games.map((g) => (
          <GameEditor key={g.id} game={g} onToggle={() => toggleActive(g)} onSave={(patch) => saveEdit(g, patch)} />
        ))}
      </div>
    </div>
  );
}

function GameEditor({
  game,
  onToggle,
  onSave,
}: {
  game: Game;
  onToggle: () => void;
  onSave: (patch: Partial<Game>) => void;
}) {
  const [name, setName] = useState(game.name);
  const [description, setDescription] = useState(game.description);
  const [emoji, setEmoji] = useState(game.emoji);
  const dirty = name !== game.name || description !== game.description || emoji !== game.emoji;

  return (
    <div className="glass p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <input className="input !w-16 !p-2 text-center text-xl" value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={4} />
          <input className="input !p-2 font-black" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <span className="pill !text-[11px]">{game.type}</span>
      </div>
      <textarea className="input mt-3 min-h-16 text-sm" value={description} onChange={(e) => setDescription(e.target.value)} />
      <div className="mt-3 flex flex-wrap gap-2">
        <button className={`btn-secondary !w-auto !px-4 !py-2 text-sm ${game.is_active ? '' : '!border-amber-400/40 !text-amber-200'}`} onClick={onToggle}>
          {game.is_active ? 'Hide from players' : 'Make live'}
        </button>
        {dirty && (
          <button className="btn !w-auto !px-4 !py-2 text-sm" onClick={() => onSave({ name, description, emoji })}>
            Save changes
          </button>
        )}
      </div>
    </div>
  );
}
