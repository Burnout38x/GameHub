'use client';
import { useState, type CSSProperties } from 'react';
import { THEMES } from '@/lib/themes';
import { saveTheme, useTheme } from '@/lib/theme-preference';

export default function ThemePicker() {
  const selected = useTheme();
  const [status, setStatus] = useState('');
  return <>
    <div className="grid gap-5 sm:grid-cols-2" role="group" aria-label="Choose your theme">
      {THEMES.map(theme => <button key={theme.id} type="button" aria-pressed={selected === theme.id} onClick={() => {
        const saved = saveTheme(theme.id);
        setStatus(`${theme.name} applied. ${saved ? 'Saved on this device.' : 'Your browser could not save the preference.'}`);
      }} className="theme-choice overflow-hidden rounded-3xl border-2 text-left" style={{ '--preview-canvas': theme.canvas, '--preview-surface': theme.surface, '--preview-accent': theme.accent, '--preview-ink': theme.ink } as CSSProperties}>
        <span className="theme-preview block p-5" aria-hidden="true">
          <span className="flex items-center justify-between text-xs font-bold"><span>GAMEHUB</span><span className="rounded-full px-2 py-1" style={{ background: theme.accent, color: '#171b20' }}>ROUND 01</span></span>
          <span className="mt-4 flex items-center gap-3 rounded-2xl p-4" style={{ background: theme.surface }}><span className="text-3xl">{theme.icon}</span><span><span className="block font-bold">Your next game night</span><span className="block text-sm">Friends. Fun. One more round.</span></span></span>
          <span className="mt-4 block rounded-xl px-4 py-2 text-center text-sm font-bold" style={{ background: theme.accent, color: '#171b20' }}>Let’s play →</span>
        </span>
        <span className="block p-5"><span className="flex items-center justify-between gap-2"><span className="text-lg font-bold">{theme.name}</span><span className="text-xs font-bold text-[var(--accent-cool)]">{selected === theme.id ? '✓ Selected' : 'Choose'}</span></span><span className="mt-2 block text-sm text-white/70">{theme.description}</span></span>
      </button>)}
    </div>
    <p className="mt-5 min-h-6 text-sm text-white/70" role="status">{status || 'Choose a look to apply it instantly. Your choice is saved on this device.'}</p>
  </>;
}
