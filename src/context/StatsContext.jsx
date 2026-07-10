import { createContext, useContext, useMemo, useState } from 'react';

// All personal-progress data lives under this one localStorage key:
// - games: history of completed rounds (for the Stats screen's list)
// - categoryStats: running correct/total counts per trivia category
// - countryMistakes: how many times each country (by cca3 code) was
//   answered incorrectly, powering the "countries you miss most" list
const STORAGE_KEY = 'worldwise:stats';

const EMPTY_STATS = { games: [], categoryStats: {}, countryMistakes: {} };

function loadStats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATS;
    return { ...EMPTY_STATS, ...JSON.parse(raw) };
  } catch {
    return EMPTY_STATS;
  }
}

function persist(stats) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

const StatsContext = createContext(null);

// Provides the saved-stats state plus the two ways to change it: recording
// a finished round, and wiping everything via the Stats screen's reset button.
export function StatsProvider({ children }) {
  const [stats, setStats] = useState(loadStats);

  const api = useMemo(
    () => ({
      stats,
      // Called once per finished round (from Results.jsx) with the round's
      // config and its full question-by-question log. Derives the
      // aggregate numbers (accuracy, per-category tallies, per-country
      // mistake counts) from that log rather than trusting the caller to
      // have computed them already.
      recordGame: ({ category, region, difficulty, mode, score, log }) => {
        setStats((prev) => {
          const correct = log.filter((e) => e.wasCorrect).length;
          const total = log.length;
          const game = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            date: new Date().toISOString(),
            category,
            region,
            difficulty,
            mode,
            score,
            correct,
            total,
            accuracy: total > 0 ? correct / total : 0,
          };

          // Roll each answered question into its own category's running
          // total, so a "mixed" round still updates all 6 category rows on
          // the Stats screen, not just one "mixed" bucket.
          const categoryStats = { ...prev.categoryStats };
          for (const entry of log) {
            const c = categoryStats[entry.category] || { correct: 0, total: 0 };
            categoryStats[entry.category] = {
              correct: c.correct + (entry.wasCorrect ? 1 : 0),
              total: c.total + 1,
            };
          }

          // Count a miss against the specific country that was asked
          // about, regardless of which category the question was.
          const countryMistakes = { ...prev.countryMistakes };
          for (const entry of log) {
            if (!entry.wasCorrect) {
              countryMistakes[entry.countryCode] = (countryMistakes[entry.countryCode] || 0) + 1;
            }
          }

          // Keep only the 50 most recent games so localStorage doesn't
          // grow unbounded over time.
          const games = [game, ...prev.games].slice(0, 50);
          const next = { games, categoryStats, countryMistakes };
          persist(next);
          return next;
        });
      },
      resetStats: () => {
        setStats(EMPTY_STATS);
        persist(EMPTY_STATS);
      },
    }),
    [stats],
  );

  return <StatsContext.Provider value={api}>{children}</StatsContext.Provider>;
}

// Hook for reading stats / recording games from any component.
export function useStats() {
  const ctx = useContext(StatsContext);
  if (!ctx) throw new Error('useStats must be used within StatsProvider');
  return ctx;
}
