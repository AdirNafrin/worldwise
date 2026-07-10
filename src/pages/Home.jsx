import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext';
import { useStats } from '../context/StatsContext';
import { LanguageToggle, ThemeToggle } from '../components/TopBar';
import { SettingsSheet } from '../components/SettingsSheet';

// Landing screen: title/logo, language + theme switches, the 3 main
// actions (start a game, view stats, open settings), and a short summary
// of the player's own stats.
export function Home() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { stats } = useStats();
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Derives the 3 headline numbers shown at the bottom of the screen from
  // the full game history; null when no games have been played yet, so the
  // UI can show a "play a round" hint instead of misleading zeros.
  const summary = useMemo(() => {
    if (stats.games.length === 0) return null;
    const best = Math.max(...stats.games.map((g) => g.score));
    const avgAccuracy =
      stats.games.reduce((sum, g) => sum + g.accuracy, 0) / stats.games.length;
    return { count: stats.games.length, best, avgAccuracy };
  }, [stats.games]);

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col px-6 pb-10 pt-8">
      {/* Header: logo + gradient title truly centered in the row (the two
          flanking grid columns share equal space regardless of the
          language/theme switches' width), switches pinned to the trailing side. */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center">
        <div />
        <div className="flex items-center justify-self-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 shadow-sm">
            <img src="/favicon.svg" alt="" className="h-7 w-7" />
          </span>
          <h1
            className="bg-clip-text text-2xl font-bold text-transparent"
            style={{ backgroundImage: 'var(--title-gradient)' }}
          >
            {t('app.name')}
          </h1>
        </div>
        <div className="flex items-center justify-self-end gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>

      {/* Primary actions: start a new game is the main call-to-action,
          stats/settings are secondary. */}
      <div className="mt-12 flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <button
          onClick={() => navigate('/setup')}
          className="w-full max-w-xs rounded-full bg-[var(--accent)] py-4 text-lg font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-[var(--accent-hover)] hover:shadow-xl active:translate-y-0 active:scale-[0.98]"
        >
          {t('home.start')}
        </button>
        <button
          onClick={() => navigate('/stats')}
          className="w-full max-w-xs rounded-full border border-slate-300 py-3 font-medium transition-all hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-md dark:border-slate-600 dark:hover:bg-slate-800"
        >
          {t('home.stats')}
        </button>
        <button
          onClick={() => setSettingsOpen(true)}
          className="w-full max-w-xs rounded-full border border-slate-300 py-3 font-medium transition-all hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-md dark:border-slate-600 dark:hover:bg-slate-800"
        >
          {t('home.settings')}
        </button>
      </div>

      {/* Quick stats card: games played / best score / average accuracy,
          or a placeholder message before the player's first round. */}
      <div className="mt-10 rounded-2xl border border-slate-200 bg-white/60 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/40">
        <h2 className="mb-3 text-center font-semibold">{t('home.yourStats')}</h2>
        {summary ? (
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xl font-bold text-[var(--accent)] dark:text-[var(--accent-text-dark)]">{summary.count}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('home.gamesPlayed')}</p>
            </div>
            <div>
              <p className="text-xl font-bold text-amber-500">{summary.best}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('home.bestScore')}</p>
            </div>
            <div>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {Math.round(summary.avgAccuracy * 100)}%
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('home.avgAccuracy')}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('home.noStatsYet')}</p>
        )}
      </div>

      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
