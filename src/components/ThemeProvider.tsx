'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Theme = 'light' | 'dark';

type ThemeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  isReady: boolean;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = 'cottagr-theme';

function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark';
}

function getPreferredTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'light';
  }

  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);
    if (isTheme(storedValue)) {
      return storedValue;
    }
  } catch (error) {
    console.warn('Unable to read theme preference from localStorage.', error);
  }

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initial = getPreferredTheme();
    setThemeState(initial);
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const root = document.documentElement;
    root.classList.remove('theme-light', 'theme-dark', 'light', 'dark');
    if (theme === 'dark') {
      root.classList.add('theme-dark', 'dark');
    } else {
      root.classList.add('theme-light', 'light');
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {
      console.warn('Unable to store theme preference in localStorage.', error);
    }
  }, [isReady, theme]);

  const toggleTheme = () => {
    setThemeState((current) => (current === 'dark' ? 'light' : 'dark'));
  };

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      toggleTheme,
      setTheme: setThemeState,
      isReady,
    }),
    [isReady, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}
