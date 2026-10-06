'use client';
import { useSyncExternalStore } from 'react';
import { normalizeTheme, THEME_STORAGE_KEY, type ThemeId } from './themes';

const themeSnapshot = () => normalizeTheme(document.documentElement.dataset.theme);
const serverTheme = () => 'dark' as const;
function subscribeTheme(onChange: () => void) {
  function syncStorage(event: StorageEvent) {
    if (event.key === THEME_STORAGE_KEY || event.key === null) {
      document.documentElement.dataset.theme = normalizeTheme(event.newValue);
      onChange();
    }
  }
  window.addEventListener('gamehub-theme-change', onChange);
  window.addEventListener('storage', syncStorage);
  return () => {
    window.removeEventListener('gamehub-theme-change', onChange);
    window.removeEventListener('storage', syncStorage);
  };
}
export const useTheme = () => useSyncExternalStore(subscribeTheme, themeSnapshot, serverTheme);
export function saveTheme(theme: ThemeId): boolean {
  document.documentElement.dataset.theme = theme;
  window.dispatchEvent(new Event('gamehub-theme-change'));
  try { localStorage.setItem(THEME_STORAGE_KEY, theme); return true; }
  catch { return false; }
}
