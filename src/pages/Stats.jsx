import { useMemo, useState } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { useStats } from '../context/StatsContext';
import { TopBar } from '../components/TopBar';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ALL_COUNTRIES, getCountryName } from '../utils/countries';
import { CATEGORIES } from '../utils/questions';

const countryByCode = new Map(ALL_COUNTRIES.map((c) => [c.cca3, c]));

export function Stats() {
  const { t, lang } = useI18n();
  const { stats, resetStats } = useStats();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const hardestCountries = useMemo(() => {
    return Object.entries(stats.countryMistakes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([code, count]) => ({ code, count, country: countryByCode.get(code) }))
      .filter((row) => row.country);
  }, [stats.countryMistakes]);

  return (
    <div className="mx-auto min-h-screen max-w-lg px-4 pb-10">
      <TopBar title={t('stats.title')} onBack={true} />

      <section className="mt-2">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {t('stats.history')}
        </h2>
        {stats.games.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('stats.history.empty')}</p>
        ) : (
          <div className="space-y-2">
            {stats.games.slice(0, 10).map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-700"
              >
                <div>
                  <p className="font-medium">
                    {t(`category.${g.category}`)} · {t(`difficulty.${g.difficulty}`)}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(g.date).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US')} ·{' '}
                    {g.region === 'all' ? t('region.all') : t(`region.${g.region}`)}
                  </p>
                </div>
                <div className="text-end">
                  <p className="font-bold">{g.score}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{Math.round(g.accuracy * 100)}%</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {t('stats.byCategory')}
        </h2>
        <div className="space-y-3">
          {CATEGORIES.map((cat) => {
            const s = stats.categoryStats[cat];
            const pct = s && s.total > 0 ? Math.round((s.correct / s.total) * 100) : null;
            return (
              <div key={cat}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{t(`category.${cat}`)}</span>
                  <span className="text-slate-500 dark:text-slate-400">{pct == null ? '—' : `${pct}%`}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div className="h-full rounded-full bg-blue-500" style={{ width: `${pct ?? 0}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {t('stats.hardestCountries')}
        </h2>
        {hardestCountries.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('stats.hardestCountries.empty')}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {hardestCountries.map((row) => (
              <span
                key={row.code}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-700"
              >
                {getCountryName(row.country, lang)} · {row.count}
              </span>
            ))}
          </div>
        )}
      </section>

      <button
        onClick={() => setConfirmOpen(true)}
        className="mt-10 w-full rounded-full border border-red-300 py-3 font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
      >
        {t('stats.reset')}
      </button>

      <ConfirmDialog
        open={confirmOpen}
        title={t('stats.reset.confirmTitle')}
        body={t('stats.reset.confirmBody')}
        confirmLabel={t('stats.reset.confirm')}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          resetStats();
          setConfirmOpen(false);
        }}
      />
    </div>
  );
}
