import { createContext, useContext, useMemo, useState } from 'react';

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

export function StatsProvider({ children }) {
  const [stats, setStats] = useState(loadStats);

  const api = useMemo(
    () => ({
      stats,
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

          const categoryStats = { ...prev.categoryStats };
          for (const entry of log) {
            const c = categoryStats[entry.category] || { correct: 0, total: 0 };
            categoryStats[entry.category] = {
              correct: c.correct + (entry.wasCorrect ? 1 : 0),
              total: c.total + 1,
            };
          }

          const countryMistakes = { ...prev.countryMistakes };
          for (const entry of log) {
            if (!entry.wasCorrect) {
              countryMistakes[entry.countryCode] = (countryMistakes[entry.countryCode] || 0) + 1;
            }
          }

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

export function useStats() {
  const ctx = useContext(StatsContext);
  if (!ctx) throw new Error('useStats must be used within StatsProvider');
  return ctx;
}
