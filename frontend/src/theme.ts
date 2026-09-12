/**
 * Light/dark theme.
 *
 * The theme itself is applied by the inline script in `index.html` before the
 * first paint (no flash); this module owns the toggle, the persistence and the
 * system-preference listener, and broadcasts a `themechange` event so canvas
 * based views (Chart.js, leaflet.heat) can re-read their literal colours.
 */
import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

/** Kept in sync with the `--bg` token of each theme in styles.css. */
const THEME_COLOR: Record<Theme, string> = { light: '#f7f5f2', dark: '#141312' };

function readStored(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    /* Storage unavailable (private mode, blocked cookies). */
    return null;
  }
}

function readApplied(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

function apply(theme: Theme, persist: boolean): void {
  document.documentElement.setAttribute('data-theme', theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLOR[theme]);
  if (persist) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* The choice simply does not survive a reload. */
    }
  }
  window.dispatchEvent(new CustomEvent<Theme>('themechange', { detail: theme }));
}

export type ThemeApi = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
};

export function useTheme(): ThemeApi {
  const [theme, setThemeState] = useState<Theme>(readApplied);

  const setTheme = useCallback((next: Theme) => {
    apply(next, true);
    setThemeState(next);
  }, []);

  const toggle = useCallback(() => {
    setTheme(readApplied() === 'dark' ? 'light' : 'dark');
  }, [setTheme]);

  /* Follow the system only while the visitor has made no explicit choice. */
  useEffect(() => {
    if (!window.matchMedia) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => {
      if (readStored()) return;
      const next: Theme = event.matches ? 'dark' : 'light';
      apply(next, false);
      setThemeState(next);
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return { theme, setTheme, toggle };
}

/**
 * A counter that increases on every theme change. Views that need literal
 * colour values (canvas drawings cannot use CSS variables) depend on it so
 * they re-read the tokens and redraw.
 */
export function useThemeVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const onChange = () => setVersion((value) => value + 1);
    window.addEventListener('themechange', onChange);
    return () => window.removeEventListener('themechange', onChange);
  }, []);
  return version;
}

/**
 * The theme currently applied to the document. `useTheme` owns a piece of local
 * state and only the component holding the toggle sees it change; a component that
 * merely follows the theme pairs this with `useThemeVersion`.
 */
export function currentTheme(): Theme {
  return readApplied();
}

/** Resolve a CSS custom property to its literal value. */
export function cssVar(name: string, fallback = ''): string {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}
