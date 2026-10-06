'use client';
import { useState, useSyncExternalStore } from 'react';

const themeSnapshot = () => document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
const serverTheme = () => 'dark';
function subscribeTheme(onChange: () => void) {
  window.addEventListener('gamehub-theme-change', onChange);
  return () => window.removeEventListener('gamehub-theme-change', onChange);
}

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeTheme, themeSnapshot, serverTheme);
  const [saved, setSaved] = useState('');
  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    window.dispatchEvent(new Event('gamehub-theme-change'));
    try { localStorage.setItem('gamehub-theme', next); setSaved('Theme saved on this device.'); }
    catch { setSaved('Theme changed. Your browser could not save the preference.'); }
  }
  return <><button type="button" className="nav-link !px-2 !border !border-white/15" onClick={toggle} aria-label={`Switch to ${theme === 'dark' ? 'bright' : 'dark'} theme`} title={`Switch to ${theme === 'dark' ? 'bright' : 'dark'} theme`}><span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span><span className="ml-2 hidden sm:inline">{theme === 'dark' ? 'Bright' : 'Dark'}</span></button><span className="sr-only" role="status">{saved}</span></>;
}
