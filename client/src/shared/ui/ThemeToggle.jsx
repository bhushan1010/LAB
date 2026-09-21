import React, { useState, useEffect, useCallback } from 'react';
import { Sun, Moon } from 'lucide-react';

const STORAGE_KEY = 'labtrack_theme';

/**
 * Custom hook to access and toggle between clinical Dark Mode and Standard Light Mode
 */
export function useTheme() {
  const [theme, setThemeState] = useState(() => {
    if (typeof window === 'undefined') return 'dark';
    return localStorage.getItem(STORAGE_KEY) || 'dark';
  });

  const applyTheme = useCallback((nextTheme) => {
    const root = document.documentElement;
    if (nextTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch (_) {}
    window.dispatchEvent(new CustomEvent('themechange', { detail: nextTheme }));
  }, []);

  useEffect(() => {
    applyTheme(theme);

    const handleExternalChange = (e) => {
      if (e.detail && e.detail !== theme) {
        setThemeState(e.detail);
      }
    };

    window.addEventListener('themechange', handleExternalChange);
    return () => window.removeEventListener('themechange', handleExternalChange);
  }, [theme, applyTheme]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      return next;
    });
  }, [applyTheme]);

  return {
    theme,
    toggleTheme,
    isDark: theme === 'dark',
  };
}

/**
 * ThemeToggle - Button to toggle between Light (Day Shift) and Dark (Night / Low-Light Console)
 *
 * Can be used as a controlled component (passing theme and onToggle)
 * or completely standalone (auto-binding to useTheme hook).
 */
export function ThemeToggle({
  theme: controlledTheme,
  onToggle: controlledOnToggle,
  className = '',
}) {
  const internalTheme = useTheme();

  const isControlled = controlledTheme !== undefined && typeof controlledOnToggle === 'function';
  const currentTheme = isControlled ? controlledTheme : internalTheme.theme;
  const handleToggle = isControlled ? controlledOnToggle : internalTheme.toggleTheme;
  const isDark = currentTheme === 'dark';

  return (
    <button
      onClick={handleToggle}
      type="button"
      className={`relative p-2 rounded-lg border transition-all duration-200 flex items-center gap-1.5 text-xs font-semibold focus:outline-none cursor-pointer ${
        isDark
          ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700 shadow-xs'
          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 shadow-xs'
      } ${className}`}
      title={isDark ? 'Switch to Light Mode (Standard Day Shift)' : 'Switch to Dark Mode (Dim Console / Night Shift)'}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {isDark ? (
        <>
          <Sun className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="hidden sm:inline">Light Mode</span>
        </>
      ) : (
        <>
          <Moon className="w-4 h-4 text-cyan-600 shrink-0" />
          <span className="hidden sm:inline">Dark Mode</span>
        </>
      )}
    </button>
  );
}

export default ThemeToggle;
