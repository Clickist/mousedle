export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'ui-theme';
const listeners = new Set<() => void>();

function storedTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light') return 'light';
    // 旧版本使用 'blast' 表示深色,迁移为 'dark'
    if (stored === 'dark' || stored === 'blast') return 'dark';
    // 未显式选择过主题时跟随系统偏好
    return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

let currentTheme = storedTheme();

function renderTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  // 防闪底色直接写死,不依赖样式表加载顺序
  document.documentElement.style.background = theme === 'dark' ? '#141413' : '#f7f5f0';
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute(
    'content',
    theme === 'dark' ? '#141413' : '#f7f5f0'
  );
}

export function initializeTheme(): void {
  currentTheme = storedTheme();
  renderTheme(currentTheme);
}

export function getTheme(): Theme {
  return currentTheme;
}

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setTheme(theme: Theme): void {
  if (theme === currentTheme) return;
  currentTheme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Theme switching still works when storage is unavailable.
  }
  renderTheme(theme);
  for (const listener of listeners) listener();
}

window.addEventListener('storage', (event) => {
  if (event.key !== STORAGE_KEY) return;
  const theme: Theme = event.newValue === 'light' ? 'light' : event.newValue === 'dark' || event.newValue === 'blast' ? 'dark' : storedTheme();
  if (theme === currentTheme) return;
  currentTheme = theme;
  renderTheme(theme);
  for (const listener of listeners) listener();
});
