import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import en from './en.json';
import he from './he.json';

const DICTS = { en, he };
const RTL_LANGS = new Set(['he']);
const STORAGE_KEY = 'worldwise:lang';

// Picks the language to show on first load: whatever the player chose
// last time (saved in localStorage), or otherwise auto-detected from the
// browser's own language setting, defaulting to English for anything that
// isn't Hebrew.
function detectInitialLang() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'en' || stored === 'he') return stored;
  return navigator.language?.toLowerCase().startsWith('he') ? 'he' : 'en';
}

const I18nContext = createContext(null);

// Provides the current language, a setter for it, the translate function
// `t`, and the current text direction - and keeps the <html lang>/<html
// dir> attributes (which drive the whole page's RTL/LTR layout) in sync
// with whatever language is selected.
export function I18nProvider({ children }) {
  const [lang, setLang] = useState(detectInitialLang);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = RTL_LANGS.has(lang) ? 'rtl' : 'ltr';
  }, [lang]);

  // Looks up `key` in the current language's dictionary, falling back to
  // English and then to the raw key itself if a translation is missing, so
  // a missing string shows up as a visible key in dev rather than blank
  // text. `vars` fills in `{placeholder}` tokens, e.g. t('a.b', { n: 3 }).
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

// Hook used throughout the app to translate text and read/change the
// current language.
export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
