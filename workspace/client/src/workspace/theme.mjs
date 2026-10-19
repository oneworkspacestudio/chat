export function resolveTheme(mode, darkSystem) { return mode === 'dark' || (mode === 'auto' && darkSystem) ? 'dark' : 'light'; }
export function applyTheme(mode) {
  const theme = resolveTheme(mode, window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  try { localStorage.setItem('workspace-theme', mode === 'auto' ? 'system' : mode); } catch {}
  window.dispatchEvent(new CustomEvent('workspace:theme', {detail: {mode, theme}}));
  return theme;
}
