import { useEffect, useRef, useState } from 'react';
import { useBlocker, useLocation, useNavigate } from 'react-router-dom';
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

// Default seconds-per-question by difficulty (overridable in Settings).
const DIFFICULTY_TIMER = { easy: 15, medium: 10, hard: 7 };
const MAX_LIVES = 3;
const ROUND_LENGTH = 20;
// How many extra practice-mode questions to generate at a time once the
// player is close to running out (practice mode has no fixed round length).
const PRACTICE_BATCH = 30;

// Lookup maps built once from the full country list, used to go from a
// question's stored country/flag reference back to the full country
// record (for the practice-mode facts panel and for turning a flag image
// path back into a readable country name in feedback text).
const countryByCode = new Map(ALL_COUNTRIES.map((c) => [c.cca3, c]));
const countryByFlag = new Map(ALL_COUNTRIES.filter((c) => c.flag).map((c) => [c.flag, c]));

// Points for one answer: a flat base, a bonus for answering with time to
// spare (scaled by how much of the timer was left), and a bonus that grows
// with the player's *existing* streak length (so it rewards sustained
// runs, not just this one answer).
function scoreFor(wasCorrect, remainingSeconds, duration, streak) {
  if (!wasCorrect) return 0;
  const base = 100;
  const speedBonus = duration ? Math.round((remainingSeconds / duration) * 50) : 0;
  const streakBonus = Math.min(streak, 5) * 10;
  return base + speedBonus + streakBonus;
}

// The main gameplay screen: shows one question at a time, handles
// answering (tap or timeout), scoring, lives, and hands off to the Results
// screen once the round ends. Also renders practice mode's per-answer
// "facts" panel, since that's just an alternate feedback state of the same screen.
export function Game() {
  const { t, lang } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { playCorrect, playWrong } = useSound();

  // The round's setup (category/region/difficulty/practice), passed in via
  // router state from GameSetup. If it's missing (e.g. the page was loaded
  // directly), there's nothing to play - see the redirect effect below.
  const config = location.state;

  // Normal rounds generate all 20 questions upfront (needed anyway for the
  // Results review screen); practice mode generates a first batch and
  // tops itself up as the player approaches the end (see goNext).
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

  // Guard against landing on /game with no round configured (e.g. a
  // refresh, or direct navigation) - bounce back to setup instead of
  // crashing on a missing `config`.
  useEffect(() => {
    if (!config) navigate('/setup', { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The in-app "✕" button asks for confirmation before quitting, but the
  // browser/OS back gesture (swipe-back on iOS, hardware back on Android,
  // or the browser's own back button) bypasses it entirely and would
  // otherwise silently abandon the round. useBlocker intercepts exactly
  // that case (a POP history action, i.e. back/forward) while leaving our
  // own navigate() calls elsewhere (quitting via the ✕, finishing the
  // round) unblocked.
  const blocker = useBlocker(({ historyAction }) => Boolean(config) && historyAction === 'POP');

  // Cancel any pending auto-advance timer if the component unmounts mid-delay.
  useEffect(() => () => clearTimeout(advanceTimeoutRef.current), []);

  // null duration disables the timer entirely (practice mode); otherwise
  // the player's custom override wins, falling back to the difficulty default.
  const duration = config?.practice ? null : settings.customTimerSeconds ?? DIFFICULTY_TIMER[config?.difficulty];
  const question = questions[index];

  const handleExpire = () => {
    if (answered) return;
    commitAnswer(null, true);
  };

  // Timer is disabled once the question is answered (freezes the bar
  // instead of continuing to tick down towards a second expiry).
  const { remainingSeconds, percent } = useTimer(answered ? null : duration, index, handleExpire);

  // Records an answer (or a timeout, when wasTimeout is true): scores it,
  // updates streak/lives, appends a log entry for the Results review
  // screen, and either schedules the next question or ends the round -
  // all in normal mode, which auto-advances; practice mode instead waits
  // for the player to tap "Next" (see the render below).
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
        // Out of lives: show this last answer's feedback briefly, then go
        // straight to Results instead of the next question.
        advanceTimeoutRef.current = setTimeout(() => finishRound(nextScore, nextLog), 1400);
        return;
      }
      // Normal mode auto-advances after a short pause so the player has
      // time to see whether they were right; practice mode's "Next"
      // button (rendered below) calls goNext() directly instead.
      advanceTimeoutRef.current = setTimeout(() => goNext(), 1400);
    }
  }

  // Resets the per-question feedback state and moves to the next question -
  // generating another batch of practice questions if the current batch is
  // almost exhausted, or ending the round if a normal-mode round has just
  // finished its last question.
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

  // Navigates to the Results screen with everything it needs to display
  // the summary and recompute/save stats: the round's config, final score,
  // and full question log.
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
      {/* Top row: quit button, live score/lives/streak. */}
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

      {/* Question counter: practice mode has no fixed total, so it just
          shows a running count instead of "X of ∞" (which read as broken). */}
      <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
        {config.practice
          ? t('game.questionPractice', { current: index + 1 })
          : t('game.question', { current: index + 1, total: ROUND_LENGTH })}
      </p>

      {!config.practice && (
        <div className="mt-2">
          <TimerBar percent={percent} remainingSeconds={remainingSeconds} />
        </div>
      )}

      <div className="mt-6 flex flex-1 flex-col">
        <QuestionPrompt question={question} t={t} />

        {/* 4-option answer grid. Each option's visual status is derived
            here (rather than stored) from whether it was picked and/or
            correct, so the coloring/icon logic lives in one place.
            Flag options go in a 2x2 grid (images read better as a compact
            grid than a tall single column); text answers stay one-per-row. */}
        <div className={`mt-6 grid gap-3 ${question.category === 'nameToFlag' ? 'grid-cols-2' : ''}`}>
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

        {/* Feedback panel: shown once the question has been answered.
            Color-coded green/red to match the correct/incorrect state,
            reveals the correct answer when the player got it wrong, and
            (practice mode only) shows the extended country facts plus a
            manual "Next" button instead of auto-advancing. */}
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
                className="mt-4 w-full rounded-full bg-[var(--accent)] py-3 font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[var(--accent-hover)] hover:shadow-lg"
              >
                {t('feedback.next')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Confirmation before abandoning an in-progress round - shown
          whether triggered by the ✕ button or by a blocked back
          navigation (see the useBlocker call above). */}
      <ConfirmDialog
        open={confirmQuit || blocker.state === 'blocked'}
        title={t('game.quit')}
        body={t('game.quitConfirm')}
        onCancel={() => {
          setConfirmQuit(false);
          if (blocker.state === 'blocked') blocker.reset();
        }}
        onConfirm={() => {
          setConfirmQuit(false);
          if (blocker.state === 'blocked') blocker.proceed();
          else navigate('/setup', { replace: true });
        }}
      />
    </div>
  );
}

// Formats a raw correct-answer value for display in the feedback text.
// Population values need unit formatting, and nameToFlag's "value" is
// actually a flag image path, so it's translated back to a country name -
// otherwise the feedback text would show something like "/flags/can.svg".
function formatAnswer(category, value, lang) {
  if (category === 'nameToPopulation') return formatPopulation(value, lang);
  if (category === 'nameToFlag') {
    const country = countryByFlag.get(value);
    return country ? getCountryName(country, lang) : value;
  }
  return value;
}

// Renders the question prompt itself (what's shown above the answer
// options), which differs per category: an image for flag questions, a
// city name for capital questions, or a country name with the relevant
// question text otherwise.
function QuestionPrompt({ question, t }) {
  switch (question.category) {
    case 'flagToName':
      return (
        <div className="flex flex-col items-center gap-4">
          <div className="h-40 w-64 overflow-hidden rounded-xl border border-slate-200 shadow-sm dark:border-slate-700">
            {/* alt text intentionally doesn't name the country - that
                would give away the answer to screen reader users. */}
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
    case 'nameToRegion':
      return <p className="text-center text-lg font-semibold">{t('game.whatIsRegion', { country: question.countryName })}</p>;
    default:
      return null;
  }
}

// One answer option. For nameToFlag questions this renders a flag image
// (in a fixed, correctly-proportioned box so it never looks stretched)
// instead of the AnswerButton's usual text label.
function AnswerOption({ category, value, status, disabled, onClick, lang, index }) {
  if (category === 'nameToFlag') {
    // Once answered, reveal which country this flag belongs to via the
    // accessible label (it stays generic - just the option's position -
    // beforehand, so it doesn't spoil the answer for screen reader users).
    const revealed = status !== 'idle' ? countryByFlag.get(value) : null;
    const flagLabel = revealed ? getCountryName(revealed, lang) : `${index + 1}`;
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        aria-label={flagLabel}
        className={`flex items-center justify-center rounded-2xl border-2 bg-slate-50 p-3 transition-all dark:bg-slate-900/40 ${
          status === 'correct'
            ? 'border-green-500'
            : status === 'incorrect'
              ? 'border-red-500'
              : status === 'revealCorrect'
                ? 'border-green-500 border-dashed'
                : status === 'muted'
                  ? 'border-slate-200 opacity-50 dark:border-slate-700'
                  : 'border-slate-200 hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-md dark:border-slate-700'
        }`}
      >
        {/* w-full + aspect-ratio (rather than a fixed px width) so the flag
            keeps its natural proportions while still shrinking to fit a
            2-column grid on narrow phone screens. */}
        <div className="aspect-[8/5] w-full max-w-40 overflow-hidden rounded-md shadow-sm ring-1 ring-black/5">
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

// Practice-mode-only panel shown after every answer: region, capital,
// area, population, and languages for the country just asked about (not a
// narrative "fun fact", since that content doesn't exist in the source
// data and would need separate hand-written copy per country).
function PracticeFacts({ subject, t, lang }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-900">
      {/* Falls back to the raw region string for the handful of
          territories (e.g. Antarctica) outside the 5 translated regions. */}
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

// One label/value row within the practice facts panel.
function Fact({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
