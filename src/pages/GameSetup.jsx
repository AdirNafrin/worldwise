import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext';
import { TopBar } from '../components/TopBar';
import { CATEGORIES } from '../utils/questions';
import { REGIONS } from '../utils/countries';

// The 6 real categories plus the "mixed" pseudo-category, in the order
// they're offered to the player.
const CATEGORY_OPTIONS = [...CATEGORIES, 'mixed'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];

// Emoji + tinted badge background for each category card, purely
// decorative (helps the grid read as more than a wall of text).
const CATEGORY_ICON = {
  flagToName: { emoji: '🏳️', badge: 'bg-blue-100 dark:bg-blue-900/50' },
  nameToFlag: { emoji: '🔍', badge: 'bg-sky-100 dark:bg-sky-900/50' },
  capitalToName: { emoji: '🏛️', badge: 'bg-amber-100 dark:bg-amber-900/50' },
  nameToCapital: { emoji: '📍', badge: 'bg-orange-100 dark:bg-orange-900/50' },
  nameToPopulation: { emoji: '👥', badge: 'bg-emerald-100 dark:bg-emerald-900/50' },
  nameToLanguage: { emoji: '💬', badge: 'bg-violet-100 dark:bg-violet-900/50' },
  mixed: { emoji: '🎲', badge: 'bg-pink-100 dark:bg-pink-900/50' },
};

// Selected-state color per difficulty (green/amber/red), doubling as a
// quick visual cue for "easier" to "harder".
const DIFFICULTY_COLOR = {
  easy: 'border-green-600 bg-green-600 text-white',
  medium: 'border-amber-500 bg-amber-500 text-white',
  hard: 'border-red-600 bg-red-600 text-white',
};

// A selectable card used for both the category grid and the mode
// (normal/practice) choice - shows a title, optional subtitle/description,
// and optional icon badge, highlighted when selected.
function OptionCard({ selected, onClick, title, subtitle, icon }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border-2 p-4 text-start transition-colors ${
        selected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
          : 'border-slate-200 bg-white hover:border-blue-300 dark:border-slate-700 dark:bg-slate-800'
      }`}
    >
      <div className="flex items-center gap-2">
        {icon && (
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base ${icon.badge}`}>
            {icon.emoji}
          </span>
        )}
        <p className="font-semibold">{title}</p>
      </div>
      {subtitle && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
    </button>
  );
}

// A small selectable pill used for region and difficulty, which don't need
// the extra description text a full OptionCard has.
function Pill({ selected, onClick, children, colorClass }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
        selected
          ? colorClass || 'border-blue-600 bg-blue-600 text-white'
          : 'border-slate-300 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800'
      }`}
    >
      {children}
    </button>
  );
}

// "New Game" screen: lets the player pick a category, region, difficulty,
// and normal-vs-practice mode, then hands that config off to the Game page
// via router state.
export function GameSetup() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [category, setCategory] = useState('mixed');
  const [region, setRegion] = useState('all');
  const [difficulty, setDifficulty] = useState('medium');
  const [practice, setPractice] = useState(false);

  // Hands the chosen setup off to /game as router state (rather than URL
  // params or a shared context) since it's only ever needed once, right
  // when the Game page mounts.
  const start = () => {
    navigate('/game', {
      state: {
        categories: [category],
        region,
        difficulty,
        practice,
      },
    });
  };

  return (
    <div className="mx-auto min-h-screen max-w-lg px-4 pb-28">
      <TopBar title={t('setup.title')} onBack={true} />

      {/* Category: 6 real categories + "mixed", single-select grid. */}
      <section className="mt-2">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {t('setup.category')}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {CATEGORY_OPTIONS.map((cat) => (
            <OptionCard
              key={cat}
              selected={category === cat}
              onClick={() => setCategory(cat)}
              title={t(`category.${cat}`)}
              subtitle={t(`category.${cat}.desc`)}
              icon={CATEGORY_ICON[cat]}
            />
          ))}
        </div>
      </section>

      {/* Region: "whole world" plus the 5 spec-defined regions. */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {t('setup.region')}
        </h2>
        <div className="flex flex-wrap gap-2">
          <Pill selected={region === 'all'} onClick={() => setRegion('all')}>
            {t('region.all')}
          </Pill>
          {REGIONS.map((r) => (
            <Pill key={r} selected={region === r} onClick={() => setRegion(r)}>
              {t(`region.${r}`)}
            </Pill>
          ))}
        </div>
      </section>

      {/* Difficulty: affects both the country pool and distractor
          closeness (see utils/countries.js and utils/questions.js). */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {t('setup.difficulty')}
        </h2>
        <div className="flex flex-wrap gap-2">
          {DIFFICULTIES.map((d) => (
            <Pill key={d} selected={difficulty === d} onClick={() => setDifficulty(d)} colorClass={DIFFICULTY_COLOR[d]}>
              {t(`difficulty.${d}`)}
            </Pill>
          ))}
        </div>
      </section>

      {/* Mode: normal (timed, 20Q, lives) vs. practice (untimed, unlimited,
          shows extended facts after each answer). */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {t('setup.mode')}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <OptionCard selected={!practice} onClick={() => setPractice(false)} title={t('setup.mode.normal')} />
          <OptionCard
            selected={practice}
            onClick={() => setPractice(true)}
            title={t('setup.mode.practice')}
            subtitle={t('setup.practice.desc')}
          />
        </div>
      </section>

      {/* Sticky "Let's play" bar pinned to the bottom of the viewport;
          the extra safe-area padding keeps it clear of the iPhone home
          indicator when installed as a standalone PWA. */}
      <div
        className="fixed inset-x-0 bottom-0 mx-auto max-w-lg border-t border-slate-200 bg-white/90 p-4 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        <button
          onClick={start}
          className="w-full rounded-full bg-blue-600 py-4 text-lg font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 active:scale-[0.98]"
        >
          {t('setup.begin')}
        </button>
      </div>
    </div>
  );
}
