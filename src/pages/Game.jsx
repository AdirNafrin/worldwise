import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext';
import { useSettings } from '../context/SettingsContext';
import { useSound } from '../hooks/useSound';
import { useTimer } from '../hooks/useTimer';
import { generateRound } from '../utils/questions';
import { ALL_COUNTRIES, formatArea, formatPopulation, getCountryName } from '../utils/countries';
import { getLanguageName } from '../utils/languages';
import { AnswerButton } from '../components/AnswerButton';
import { TimerBar } from '../components/TimerBar';
import { FlagImage } from '../components/FlagImage';
import { ConfirmDialog } from '../components/ConfirmDialog';

const DIFFICULTY_TIMER = { easy: 15, medium: 10, hard: 7 };
const MAX_LIVES = 3;
const ROUND_LENGTH = 20;
const PRACTICE_BATCH = 30;

const countryByCode = new Map(ALL_COUNTRIES.map((c) => [c.cca3, c]));
const countryByFlag = new Map(ALL_COUNTRIES.filter((c) => c.flag).map((c) => [c.flag, c]));

function scoreFor(wasCorrect, remainingSeconds, duration, streak) {
  if (!wasCorrect) return 0;
  const base = 100;
  const speedBonus = duration ? Math.round((remainingSeconds / duration) * 50) : 0;
  const streakBonus = Math.min(streak, 5) * 10;
  return base + speedBonus + streakBonus;
}

export function Game() {
  const { t, lang } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { playCorrect, playWrong } = useSound();

  const config = location.state;

  const [questions, setQuestions] = useState(() =>
    config ? generateRound({ ...config, count: config.practice ? PRACTICE_BATCH : ROUND_LENGTH, lang }) : [],
  );
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [streak, setStreak] = useState(0);
  const [log, setLog] = useState([]);
  const [answered, setAnswered] = useState(false);
  const [selected, setSelected] = useState(null);
  const [timedOut, setTimedOut] = useState(false);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const advanceTimeoutRef = useRef(null);

  // setTimeout-scheduled callbacks (goNext/finishRound) close over whatever
  // score/log value existed at click time, which is one render behind the
  // setState call made in the same commitAnswer invocation. Refs give those
  // delayed callbacks a way to read the just-updated values instead.
  const scoreRef = useRef(score);
  const logRef = useRef(log);

  useEffect(() => {
    if (!config) navigate('/setup', { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => clearTimeout(advanceTimeoutRef.current), []);

  const duration = config?.practice ? null : settings.customTimerSeconds ?? DIFFICULTY_TIMER[config?.difficulty];
  const question = questions[index];

  const handleExpire = () => {
    if (answered) return;
    commitAnswer(null, true);
  };

  const { remainingSeconds, percent } = useTimer(answered ? null : duration, index, handleExpire);

  function commitAnswer(answer, wasTimeout) {
    if (!question) return;
    const wasCorrect = !wasTimeout && answer === question.correctAnswer;
    setAnswered(true);
    setSelected(answer);
    setTimedOut(Boolean(wasTimeout));

    const nextScore = wasCorrect ? score + scoreFor(true, remainingSeconds, duration, streak) : score;
    scoreRef.current = nextScore;
    setScore(nextScore);

    if (wasCorrect) {
      playCorrect();
      setStreak((s) => s + 1);
    } else {
      playWrong();
      setStreak(0);
    }

    const nextLog = [
      ...logRef.current,
      {
        category: question.category,
        countryCode: question.countryCode,
        options: question.options,
        correctAnswer: question.correctAnswer,
        userAnswer: wasTimeout ? null : answer,
        wasCorrect,
        wasTimeout: Boolean(wasTimeout),
      },
    ];
    logRef.current = nextLog;
    setLog(nextLog);

    if (!config.practice) {
      const livesLeft = wasCorrect ? lives : lives - 1;
      if (!wasCorrect) setLives(livesLeft);
      if (livesLeft <= 0) {
        advanceTimeoutRef.current = setTimeout(() => finishRound(nextScore, nextLog), 1400);
        return;
      }
      advanceTimeoutRef.current = setTimeout(() => goNext(), 1400);
    }
  }

  function goNext() {
    setAnswered(false);
    setSelected(null);
    setTimedOut(false);

    if (config.practice && index + 2 >= questions.length) {
      setQuestions((prev) => [...prev, ...generateRound({ ...config, count: PRACTICE_BATCH, lang })]);
    }

    if (!config.practice && index + 1 >= questions.length) {
      finishRound(scoreRef.current, logRef.current);
      return;
    }
    setIndex((i) => i + 1);
  }

  function finishRound(finalScore, finalLog) {
    navigate('/results', {
      replace: true,
      state: {
        config,
        score: finalScore,
        log: finalLog,
      },
    });
  }

  if (!config || !question) return null;

  const subject = countryByCode.get(question.countryCode);

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col px-4 pb-8 pt-4">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setConfirmQuit(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-lg text-slate-500 shadow-sm hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-red-950/40 dark:hover:text-red-400"
          aria-label={t('game.quit')}
        >
          ✕
        </button>
        <div className="flex flex-1 items-center justify-center gap-4 text-sm font-medium">
          <span>{t('game.score')}: {score}</span>
          {!config.practice && <span>❤️ {Math.max(lives, 0)}</span>}
          {streak > 1 && <span>🔥 {streak}</span>}
        </div>
      </div>

      <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
        {config.practice
          ? t('game.question', { current: index + 1, total: '∞' })
          : t('game.question', { current: index + 1, total: ROUND_LENGTH })}
      </p>

      {!config.practice && (
        <div className="mt-2">
          <TimerBar percent={percent} remainingSeconds={remainingSeconds} />
        </div>
      )}

      <div className="mt-6 flex flex-1 flex-col">
        <QuestionPrompt question={question} t={t} />

        <div className="mt-6 grid gap-3">
          {question.options.map((opt, i) => {
            let status = 'idle';
            if (answered) {
              const isCorrectOpt = opt === question.correctAnswer;
              const isSelectedOpt = opt === selected;
              if (isSelectedOpt && isCorrectOpt) status = 'correct';
              else if (isSelectedOpt && !isCorrectOpt) status = 'incorrect';
              else if (isCorrectOpt) status = 'revealCorrect';
              else status = 'muted';
            }
            return (
              <AnswerOption
                key={i}
                index={i}
                category={question.category}
                value={opt}
                status={status}
                disabled={answered}
                lang={lang}
                onClick={() => !answered && commitAnswer(opt, false)}
              />
            );
          })}
        </div>

        {answered && (
          <div
            className={`mt-6 rounded-2xl border p-4 ${
              selected === question.correctAnswer
                ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30'
                : 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30'
            }`}
          >
            <p className={`font-semibold ${selected === question.correctAnswer ? 'text-green-600' : 'text-red-600'}`}>
              {timedOut ? t('feedback.timeUp') : selected === question.correctAnswer ? t('feedback.correct') : t('feedback.incorrect')}
            </p>
            {selected !== question.correctAnswer && (
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {t('feedback.correctAnswerWas', { answer: formatAnswer(question.category, question.correctAnswer, lang) })}
              </p>
            )}
            {config.practice && subject && <PracticeFacts subject={subject} t={t} lang={lang} />}
            {config.practice && (
              <button
                onClick={goNext}
                className="mt-4 w-full rounded-full bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700"
              >
                {t('feedback.next')}
              </button>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmQuit}
        title={t('game.quit')}
        body={t('game.quitConfirm')}
        onCancel={() => setConfirmQuit(false)}
        onConfirm={() => navigate('/setup', { replace: true })}
      />
    </div>
  );
}

function formatAnswer(category, value, lang) {
  if (category === 'nameToPopulation') return formatPopulation(value, lang);
  if (category === 'nameToFlag') {
    const country = countryByFlag.get(value);
    return country ? getCountryName(country, lang) : value;
  }
  return value;
}

function QuestionPrompt({ question, t }) {
  switch (question.category) {
    case 'flagToName':
      return (
        <div className="flex flex-col items-center gap-4">
          <div className="h-40 w-64 overflow-hidden rounded-xl border border-slate-200 shadow-sm dark:border-slate-700">
            <FlagImage src={question.flag} alt={t('game.flagAltHidden')} />
          </div>
          <p className="text-lg font-semibold">{t('game.whichCountry')}</p>
        </div>
      );
    case 'nameToFlag':
      return <p className="text-center text-lg font-semibold">{t('game.whichFlag')}<br />{question.countryName}</p>;
    case 'capitalToName':
      return (
        <div className="text-center">
          <p className="text-2xl font-bold">{question.capital}</p>
          <p className="mt-2 text-lg font-semibold">{t('game.whichCountryCapital')}</p>
        </div>
      );
    case 'nameToCapital':
      return <p className="text-center text-lg font-semibold">{t('game.whatIsCapital', { country: question.countryName })}</p>;
    case 'nameToPopulation':
      return <p className="text-center text-lg font-semibold">{t('game.whatIsPopulation', { country: question.countryName })}</p>;
    case 'nameToLanguage':
      return <p className="text-center text-lg font-semibold">{t('game.whatIsLanguage', { country: question.countryName })}</p>;
    default:
      return null;
  }
}

function AnswerOption({ category, value, status, disabled, onClick, lang, index }) {
  if (category === 'nameToFlag') {
    const revealed = status !== 'idle' ? countryByFlag.get(value) : null;
    const flagLabel = revealed ? getCountryName(revealed, lang) : `${index + 1}`;
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        aria-label={flagLabel}
        className={`overflow-hidden rounded-2xl border-2 transition-colors ${
          status === 'correct'
            ? 'border-green-500'
            : status === 'incorrect'
              ? 'border-red-500'
              : status === 'revealCorrect'
                ? 'border-green-500 border-dashed'
                : status === 'muted'
                  ? 'border-slate-200 opacity-50 dark:border-slate-700'
                  : 'border-slate-200 hover:border-blue-400 dark:border-slate-700'
        }`}
      >
        <div className="h-20 w-full">
          <FlagImage src={value} alt="" />
        </div>
      </button>
    );
  }

  const label = category === 'nameToPopulation' ? formatPopulation(value, lang) : value;
  return (
    <AnswerButton status={status} disabled={disabled} onClick={onClick}>
      {label}
    </AnswerButton>
  );
}

function PracticeFacts({ subject, t, lang }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-900">
      <Fact label={t('feedback.facts.region')} value={t(`region.${subject.region}`) !== `region.${subject.region}` ? t(`region.${subject.region}`) : subject.region} />
      <Fact label={t('feedback.facts.capital')} value={subject.capital || '—'} />
      <Fact label={t('feedback.facts.area')} value={formatArea(subject.area, lang)} />
      <Fact label={t('feedback.facts.population')} value={formatPopulation(subject.population, lang)} />
      <div className="col-span-2">
        <Fact
          label={t('feedback.facts.languages')}
          value={subject.languages.map((l) => getLanguageName(l, lang)).join(', ') || '—'}
        />
      </div>
    </div>
  );
}

function Fact({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
