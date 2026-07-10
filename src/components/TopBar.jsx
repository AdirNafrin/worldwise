import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext';
import { useSettings } from '../context/SettingsContext';

// Chevron that points the correct visual direction for "back" in both
// writing directions: in RTL (Hebrew), "back" is to the right, so the
// icon (drawn pointing left) needs to be flipped 180deg.
function BackIcon({ dir }) {
  const rotate = dir === 'rtl' ? 'rotate-180' : '';
  return (
    <svg className={`h-5 w-5 ${rotate}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Shared page header: optional back button, a title, and optional extra
// controls on the trailing side. `onBack` can be `true` (just go back one
// history entry) or a custom handler (e.g. GameSetup's back button behaves
// differently mid-flow).
export function TopBar({ title, onBack, actions }) {
  const navigate = useNavigate();
  const { dir } = useI18n();

  return (
    <div className="flex items-center gap-3 px-4 py-4">
      {onBack && (
        <button
          onClick={onBack === true ? () => navigate(-1) : onBack}
          className="rounded-full p-2 hover:bg-slate-200/60 dark:hover:bg-slate-800"
          aria-label="back"
        >
          <BackIcon dir={dir} />
        </button>
      )}
      <h1 className="flex-1 text-lg font-semibold">{title}</h1>
      <div className="flex items-center gap-2">{actions}</div>
    </div>
  );
}

// Small pill button that flips the UI language between Hebrew and English.
// Shows the *other* language's label (so tapping "EN" while in Hebrew
// switches to English), which is the common convention for language
// switchers.
export function LanguageToggle() {
  const { lang, setLang } = useI18n();
  return (
    <button
      onClick={() => setLang(lang === 'he' ? 'en' : 'he')}
      className="rounded-full border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
      aria-label="toggle language"
    >
      {lang === 'he' ? 'EN' : 'עב'}
    </button>
  );
}

// Sun/moon toggle for light/dark mode; the chosen theme is persisted by
// SettingsContext so it's remembered on the next visit.
export function ThemeToggle() {
  const { settings, toggleTheme } = useSettings();
  const isDark = settings.theme === 'dark';
  return (
    <button
      onClick={toggleTheme}
      className="rounded-full border border-slate-300 p-2 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
      aria-label="toggle theme"
    >
      {isDark ? (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.5 5.5 0 01-7.54-7.54c-.44-.06-.9-.1-1.36-.1z" />
        </svg>
      ) : (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 4V2m0 20v-2m8-8h2M2 12h2m13.66-6.66l1.42-1.42M4.92 19.08l1.42-1.42M19.08 19.08l-1.42-1.42M4.92 4.92L6.34 6.34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="12" r="5" />
        </svg>
      )}
    </button>
  );
}
