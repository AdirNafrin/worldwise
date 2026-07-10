import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext';
import { useStats } from '../context/StatsContext';
import { ALL_COUNTRIES, formatPopulation, getCountryName } from '../utils/countries';
import { FlagImage } from '../components/FlagImage';
import { markFirstRoundDone } from '../components/InstallBanner';

const countryByCode = new Map(ALL_COUNTRIES.map((c) => [c.cca3, c]));
const countryByFlag = new Map(ALL_COUNTRIES.filter((c) => c.flag).map((c) => [c.flag, c]));

// End-of-round summary: final score, accuracy, a full question-by-question
// review, and the entry point for saving this game into personal stats.
export function Results() {
  const { t, lang } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const { stats, recordGame } = useStats();
  const [reviewOpen, setReviewOpen] = useState(false);
  // Guards against recording the same game twice (React 18/19 StrictMode
  // runs effects twice in development) and against the "new best score"
  // check comparing against a stats value that already includes this game.
  const recordedRef = useRef(false);
  const prevBestRef = useRef(null);

  // Passed in via router state from Game.jsx's finishRound(); see the
  // redirect effect below for what happens if it's missing.
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

  // No round data (e.g. this page was opened directly, not via a finished
  // round) - there's nothing to show, so bounce back to Home.
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
      {/* Different headline when the round ended early from running out of
          lives, vs. a normal completed round or a practice session stopped
          by the player. */}
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
        {/* "Play again" reuses this same round's config (category/region/
            difficulty/mode) and jumps straight back into a fresh game -
            it does not go through the setup screen. Anyone wanting to
            change settings first uses "Back to home" instead. */}
        <button
          onClick={() => navigate('/game', { replace: true, state: data.config })}
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

      {/* Full round review: every question asked, what the player picked,
          and the correct answer - not just a list of missed countries. */}
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

// Builds accessible alt text for a review-row flag thumbnail by looking up
// which country that flag image path belongs to (the log only stores the
// image path, not the country, since that's all the question needed at
// the time it was generated).
function flagAlt(flagSrc, t, lang) {
  const country = countryByFlag.get(flagSrc);
  return country ? t('game.flagAlt', { country: getCountryName(country, lang) }) : '';
}

// Formats a logged answer value for display in the review list; only
// population values need special formatting (raw numbers otherwise).
function optionLabel(category, value, lang) {
  if (category === 'nameToPopulation') return formatPopulation(value, lang);
  return value;
}

// One row in the review list: which question it was, whether the player
// got it right, their answer, and (if wrong) the correct answer. Renders
// flag thumbnails instead of text for nameToFlag questions, since the
// logged "answer" there is an image path, not a readable string.
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
        {/* Correct answer is only shown when the player got it wrong -
            redundant (and visually noisy) to repeat it when they were right. */}
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
