import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'worldwise:settings';

const DEFAULTS = {
  theme: 'light',
  soundMuted: false,
  customTimerSeconds: null, // null = use difficulty default
};

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

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
