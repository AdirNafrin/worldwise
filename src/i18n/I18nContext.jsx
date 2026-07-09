import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import en from './en.json';
import he from './he.json';

const DICTS = { en, he };
const RTL_LANGS = new Set(['he']);
const STORAGE_KEY = 'worldwise:lang';

function detectInitialLang() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'en' || stored === 'he') return stored;
  return navigator.language?.toLowerCase().startsWith('he') ? 'he' : 'en';
}

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(detectInitialLang);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = RTL_LANGS.has(lang) ? 'rtl' : 'ltr';
  }, [lang]);

  const t = useCallback(
    (key, vars) => {
      const dict = DICTS[lang] || DICTS.en;
      let str = dict[key] ?? DICTS.en[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          str = str.replaceAll(`{${k}}`, String(v));
        }
      }
      return str;
    },
    [lang],
  );

  const value = useMemo(
    () => ({ lang, setLang, t, dir: RTL_LANGS.has(lang) ? 'rtl' : 'ltr' }),
    [lang, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
