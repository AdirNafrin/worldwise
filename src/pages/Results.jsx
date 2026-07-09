import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext';
import { useStats } from '../context/StatsContext';
import { ALL_COUNTRIES, formatPopulation, getCountryName } from '../utils/countries';
import { FlagImage } from '../components/FlagImage';
import { markFirstRoundDone } from '../components/InstallBanner';

const countryByCode = new Map(ALL_COUNTRIES.map((c) => [c.cca3, c]));
const countryByFlag = new Map(ALL_COUNTRIES.filter((c) => c.flag).map((c) => [c.flag, c]));

export function Results() {
  const { t, lang } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const { stats, recordGame } = useStats();
  const [reviewOpen, setReviewOpen] = useState(false);
  const recordedRef = useRef(false);
  const prevBestRef = useRef(null);

  const data = location.state;

  useEffect(() => {
    if (!data) return;
    if (prevBestRef.current === null) {
      prevBestRef.current = stats.games.length ? Math.max(...stats.games.map((g) => g.score)) : 0;
    }
    if (!recordedRef.current) {
      recordedRef.current = true;
      recordGame({
        category: data.config.categories[0],
        region: data.config.region,
        difficulty: data.config.difficulty,
        mode: data.config.practice ? 'practice' : 'normal',
        score: data.score,
        log: data.log,
      });
      markFirstRoundDone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  useEffect(() => {
    if (!data) navigate('/', { replace: true });
  }, [data, navigate]);

  const correct = useMemo(() => data?.log.filter((e) => e.wasCorrect).length ?? 0, [data]);
  const total = data?.log.length ?? 0;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const isNewBest = prevBestRef.current !== null && data && data.score > prevBestRef.current;

  if (!data) return null;

  return (
    <div className="mx-auto min-h-screen max-w-lg px-6 pb-10 pt-8">
      <h1 className="text-center text-2xl font-bold">
        {data.log.length < 20 && !data.config.practice ? t('results.gameOverEarly') : t('results.title')}
      </h1>

      <div className="mt-6 rounded-3xl border border-slate-200 p-6 text-center dark:border-slate-700">
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('results.score')}</p>
        <p className="text-5xl font-extrabold text-blue-600">{data.score}</p>
        {isNewBest && (
          <p className="mt-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
            🏆 {t('results.newBest')}
          </p>
        )}
        <div className="mt-4 flex justify-center gap-8">
          <div>
            <p className="text-xl font-bold">{accuracy}%</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('results.accuracy')}</p>
          </div>
          <div>
            <p className="text-xl font-bold">{correct}/{total}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('results.correctOf', { correct, total })}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <button
          onClick={() => navigate('/setup')}
          className="w-full rounded-full bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700"
        >
          {t('results.playAgain')}
        </button>
        <button
          onClick={() => navigate('/')}
          className="w-full rounded-full border border-slate-300 py-3 font-medium hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
        >
          {t('results.backHome')}
        </button>
        <button
          onClick={() => setReviewOpen((o) => !o)}
          className="w-full rounded-full border border-slate-300 py-3 font-medium hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
        >
          {t('results.review')}
        </button>
      </div>

      {reviewOpen && (
        <div className="mt-6 space-y-3">
          {data.log.map((entry, i) => (
            <ReviewRow key={i} index={i} entry={entry} t={t} lang={lang} />
          ))}
        </div>
      )}
    </div>
  );
}

function flagAlt(flagSrc, t, lang) {
  const country = countryByFlag.get(flagSrc);
  return country ? t('game.flagAlt', { country: getCountryName(country, lang) }) : '';
}

function optionLabel(category, value, lang) {
  if (category === 'nameToPopulation') return formatPopulation(value, lang);
  return value;
}

function ReviewRow({ index, entry, t, lang }) {
  const subject = countryByCode.get(entry.countryCode);
  const isFlagCategory = entry.category === 'nameToFlag';

  return (
    <div
      className={`rounded-2xl border p-4 ${entry.wasCorrect ? 'border-green-200 dark:border-green-900' : 'border-red-200 dark:border-red-900'}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {index + 1}. {t(`category.${entry.category}`)} — {subject ? getCountryName(subject, lang) : ''}
        </p>
        <span>{entry.wasCorrect ? '✅' : '❌'}</span>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {entry.wasTimeout ? t('results.review.timedOut') : t('results.review.yourAnswer')}
          </p>
          {isFlagCategory && entry.userAnswer ? (
            <div className="mt-1 h-8 w-14 overflow-hidden rounded border border-slate-200 dark:border-slate-700">
              <FlagImage src={entry.userAnswer} alt={flagAlt(entry.userAnswer, t, lang)} />
            </div>
          ) : (
            <p className="font-medium">
              {entry.userAnswer ? optionLabel(entry.category, entry.userAnswer, lang) : '—'}
            </p>
          )}
        </div>
        {!entry.wasCorrect && (
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('results.review.correctAnswer')}</p>
            {isFlagCategory ? (
              <div className="mt-1 h-8 w-14 overflow-hidden rounded border border-slate-200 dark:border-slate-700">
                <FlagImage src={entry.correctAnswer} alt={flagAlt(entry.correctAnswer, t, lang)} />
              </div>
            ) : (
              <p className="font-medium">{optionLabel(entry.category, entry.correctAnswer, lang)}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
