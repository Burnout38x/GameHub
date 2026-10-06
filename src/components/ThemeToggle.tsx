'use client';
import { useState } from 'react';
import { saveTheme, useTheme } from '@/lib/theme-preference';

export default function ThemeToggle() {
  const theme = useTheme();
  const [saved, setSaved] = useState('');
  const next = theme === 'light' ? 'dark' : 'light';
  const label = `Switch to ${next === 'light' ? 'bright' : 'dark'} theme`;
  function toggle() {
    setSaved(saveTheme(next) ? 'Theme saved on this device.' : 'Theme changed. Your browser could not save the preference.');
  }
  return <><button type="button" className="nav-link !px-2 !border !border-white/15" onClick={toggle} aria-label={label} title={label}><span aria-hidden="true">{next === 'light' ? '☀' : '☾'}</span><span className="ml-2 hidden sm:inline">{next === 'light' ? 'Bright' : 'Dark'}</span></button><span className="sr-only" role="status">{saved}</span></>;
}
