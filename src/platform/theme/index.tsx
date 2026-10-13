'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type ThemeChoice = 'system' | 'light' | 'dark' | 'hc';
export type DisplayMode = 'auto' | 'tv' | 'kiosk';

type Ctx = {
  theme: ThemeChoice;
  setTheme: (t: ThemeChoice) => void;
  reducedMotion: boolean;
  setReducedMotion: (v: boolean) => void;
  display: DisplayMode;
  setDisplay: (d: DisplayMode) => void;
};
const ThemeCtx = createContext<Ctx | null>(null);

function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax`;
}

type Props = {
  children: ReactNode;
  initialTheme?: ThemeChoice;
  initialReducedMotion?: boolean;
  initialDisplay?: DisplayMode;
};

/** Mirrors the choice to <html data-*> and to cookies so the server renders the right theme with no flash. */
export function ThemeProvider({
  children,
  initialTheme = 'system',
  initialReducedMotion = false,
  initialDisplay = 'auto',
}: Props) {
  const [theme, setThemeState] = useState<ThemeChoice>(initialTheme);
  const [reducedMotion, setReducedState] = useState(initialReducedMotion);
  const [display, setDisplayState] = useState<DisplayMode>(initialDisplay);

  useEffect(() => {
    const el = document.documentElement;
    el.dataset.theme = theme;
    el.dataset.display = display;
    if (reducedMotion) el.dataset.motion = 'reduced';
    else delete el.dataset.motion;
  }, [theme, reducedMotion, display]);

  const setTheme = useCallback((t: ThemeChoice) => {
    setThemeState(t);
    writeCookie('nx_theme', t);
  }, []);
  const setReducedMotion = useCallback((v: boolean) => {
    setReducedState(v);
    writeCookie('nx_motion', v ? 'reduced' : 'full');
  }, []);
  const setDisplay = useCallback((d: DisplayMode) => {
    setDisplayState(d);
    writeCookie('nx_display', d);
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, reducedMotion, setReducedMotion, display, setDisplay }),
    [theme, setTheme, reducedMotion, setReducedMotion, display, setDisplay],
  );
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

/**
 * Reads and sets the colour theme (system, light, dark, high contrast), reduced motion and display mode (auto,
 * tv, kiosk). Throws without ThemeProvider.
 */
export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error('useTheme needs ThemeProvider');
  return ctx;
}
