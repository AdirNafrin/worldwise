import { useI18n } from '../i18n/I18nContext';
import { PALETTES, useSettings } from '../context/SettingsContext';
import { SOUND_THEMES, useSound } from '../hooks/useSound';

// Preset custom timer lengths (seconds) a player can pin instead of using
// the difficulty's automatic default.
const TIMER_OPTIONS = [5, 7, 10, 15, 20, 30];

// Bottom-sheet (drawer) modal opened from the Home screen, letting the
// player change language, theme, sound, and the question timer. All of the
// actual values live in I18nContext/SettingsContext - this component is
// just the UI for editing them.
export function SettingsSheet({ open, onClose }) {
  const { t, lang, setLang } = useI18n();
  const { settings, toggleTheme, setPalette, toggleSound, setSoundTheme, setCustomTimerSeconds } =
    useSettings();
  const { previewTheme } = useSound();

  if (!open) return null;

  return (
    // Clicking the dimmed backdrop closes the sheet; clicking inside the
    // sheet itself must not (stopPropagation below), or every tap on a
    // setting would also close the sheet.
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        // max-h + overflow-y-auto: on short viewports (phone landscape,
        // small/old phones) this sheet's content can be taller than the
        // screen. Without a cap it would overflow past the top of the
        // viewport, taking the close button and the last settings with it,
        // with no way to scroll back to them.
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-3xl dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('settings.title')}</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
            aria-label={t('common.close')}
          >
            ✕
          </button>
        </div>

        <div className="space-y-5">
          {/* Language: switches both the UI text and document dir (RTL/LTR). */}
          <div className="flex items-center justify-between">
            <span className="font-medium">{t('settings.language')}</span>
            <div className="flex overflow-hidden rounded-full border border-slate-300 dark:border-slate-600">
              <button
                onClick={() => setLang('he')}
                className={`px-4 py-1.5 text-sm ${lang === 'he' ? 'bg-[var(--accent)] text-white' : ''}`}
              >
                עברית
              </button>
              <button
                onClick={() => setLang('en')}
                className={`px-4 py-1.5 text-sm ${lang === 'en' ? 'bg-[var(--accent)] text-white' : ''}`}
              >
                English
              </button>
            </div>
          </div>

          {/* Theme: light/dark, persisted and applied as a `dark` class on <html>. */}
          <div className="flex items-center justify-between">
            <span className="font-medium">{t('settings.theme')}</span>
            <div className="flex overflow-hidden rounded-full border border-slate-300 dark:border-slate-600">
              <button
                onClick={() => settings.theme !== 'light' && toggleTheme()}
                className={`px-4 py-1.5 text-sm ${settings.theme === 'light' ? 'bg-[var(--accent)] text-white' : ''}`}
              >
                {t('settings.theme.light')}
              </button>
              <button
                onClick={() => settings.theme !== 'dark' && toggleTheme()}
                className={`px-4 py-1.5 text-sm ${settings.theme === 'dark' ? 'bg-[var(--accent)] text-white' : ''}`}
              >
                {t('settings.theme.dark')}
              </button>
            </div>
          </div>

          {/* Color palette: which accent color scheme is active (independent
              of light/dark). Each swatch button carries its own
              `data-palette` attribute so its preview dot always shows that
              palette's real --accent color, regardless of which one is
              currently active app-wide. */}
          <div>
            <span className="font-medium">{t('settings.palette')}</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {PALETTES.map((p) => (
                <button
                  key={p}
                  data-palette={p}
                  onClick={() => setPalette(p)}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-all hover:-translate-y-0.5 hover:shadow-sm ${
                    settings.palette === p
                      ? 'border-[var(--accent)]'
                      : 'border-slate-300 dark:border-slate-600'
                  }`}
                >
                  <span className="h-4 w-4 rounded-full bg-[var(--accent)]" />
                  {t(`settings.palette.${p}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Sound: mutes/unmutes the correct/incorrect answer tones. */}
          <div className="flex items-center justify-between">
            <span className="font-medium">{t('settings.sound')}</span>
            <button
              onClick={toggleSound}
              role="switch"
              aria-checked={!settings.soundMuted}
              className={`h-7 w-12 rounded-full p-1 transition-colors ${!settings.soundMuted ? 'bg-[var(--accent)]' : 'bg-slate-300 dark:bg-slate-600'}`}
            >
              <span
                className={`block h-5 w-5 rounded-full bg-white transition-transform ${!settings.soundMuted ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          {/* Sound theme: which synthesized tone set plays on correct/wrong
              answers. The preview (▶) button always plays, even while
              muted, so the player can audition a theme before choosing it. */}
          <div>
            <span className="font-medium">{t('settings.soundTheme')}</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(SOUND_THEMES).map(([key, theme]) => (
                <div
                  key={key}
                  className={`flex items-center gap-1 rounded-full border pe-1 ps-3 py-1.5 text-sm ${
                    settings.soundTheme === key
                      ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                      : 'border-slate-300 dark:border-slate-600'
                  }`}
                >
                  <button onClick={() => setSoundTheme(key)}>{t(theme.label)}</button>
                  <button
                    onClick={() => previewTheme(key)}
                    aria-label={t('settings.soundTheme.preview')}
                    className={`flex h-6 w-6 items-center justify-center rounded-full ${
                      settings.soundTheme === key ? 'bg-[var(--accent-hover)]' : 'bg-slate-100 dark:bg-slate-700'
                    }`}
                  >
                    ▶
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Timer override: "Automatic" clears the override so Game.jsx
              falls back to the selected difficulty's default seconds-per-question. */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium">{t('settings.timer')}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setCustomTimerSeconds(null)}
                className={`rounded-full border px-3 py-1.5 text-sm ${settings.customTimerSeconds == null ? 'border-[var(--accent)] bg-[var(--accent)] text-white' : 'border-slate-300 dark:border-slate-600'}`}
              >
                {t('settings.timer.auto')}
              </button>
              {TIMER_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setCustomTimerSeconds(s)}
                  className={`rounded-full border px-3 py-1.5 text-sm ${settings.customTimerSeconds === s ? 'border-[var(--accent)] bg-[var(--accent)] text-white' : 'border-slate-300 dark:border-slate-600'}`}
                >
                  {t('settings.timer.custom', { seconds: s })}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t('settings.timer.hint')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
