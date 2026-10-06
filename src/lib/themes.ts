export const THEMES = [
  { id: 'dark', name: 'Game night', description: 'Warm amber and soft teal for a relaxed evening.', icon: '🌙', canvas: '#10151b', surface: '#1b242d', accent: '#f7bd78', ink: '#f7f4ed' },
  { id: 'light', name: 'Daylight', description: 'Creamy cards and fresh green for daytime play.', icon: '☀️', canvas: '#fcf7ed', surface: '#ffffff', accent: '#f5b35f', ink: '#243136' },
  { id: 'arcade', name: 'Neon arcade', description: 'Electric lavender and pink with a midnight glow.', icon: '👾', canvas: '#171126', surface: '#28203b', accent: '#d1b3ff', ink: '#faf5ff' },
  { id: 'ocean', name: 'Ocean lounge', description: 'Deep blue, mint, and a calmer kind of game night.', icon: '🌊', canvas: '#0b1d2b', surface: '#163344', accent: '#87e3cf', ink: '#eefaff' },
] as const;
export type ThemeId = typeof THEMES[number]['id'];
export const THEME_STORAGE_KEY = 'gamehub-theme';
export function normalizeTheme(value: string | null | undefined): ThemeId {
  return THEMES.find(theme => theme.id === value)?.id ?? 'dark';
}
// Runs before paint; share the allowlist with the picker to preserve every theme on reload.
export const THEME_BOOTSTRAP = `try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});document.documentElement.dataset.theme=${JSON.stringify(THEMES.map(theme => theme.id))}.includes(t)?t:"dark"}catch(e){document.documentElement.dataset.theme="dark"}`;
