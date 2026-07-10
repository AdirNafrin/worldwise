import { createContext, useContext, useEffect, useMemo, useState } from 'react';

// User preferences that persist across visits: theme, sound on/off, and an
// optional manual override for the per-question timer.
const STORAGE_KEY = 'worldwise:settings';

const DEFAULTS = {
  theme: 'light',
  soundMuted: false,
  customTimerSeconds: null, // null = use difficulty default
};

// Reads saved settings from localStorage, falling back to defaults if
// nothing is saved yet or the saved value is corrupt/unparseable.
function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

const SettingsContext = createContext(null);

// Provides app-wide settings state and keeps it in sync with both
// localStorage and the <html> element's `dark` class (which is what
// Tailwind's dark: variant actually looks for).
export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(loadSettings);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
  }, [settings]);

  const api = useMemo(
    () => ({
      settings,
      toggleTheme: () =>
        setSettings((s) => ({ ...s, theme: s.theme === 'dark' ? 'light' : 'dark' })),
      toggleSound: () => setSettings((s) => ({ ...s, soundMuted: !s.soundMuted })),
      setCustomTimerSeconds: (seconds) =>
        setSettings((s) => ({ ...s, customTimerSeconds: seconds })),
    }),
    [settings],
  );

  return <SettingsContext.Provider value={api}>{children}</SettingsContext.Provider>;
}

// Hook for reading/updating settings from any component. Throws if used
// outside the provider so a missing <SettingsProvider> fails loudly
// instead of silently returning nothing.
export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
