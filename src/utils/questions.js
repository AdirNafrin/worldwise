import { buildSubjectPool, getCountryName } from './countries';
import { getLanguageName } from './languages';
import { shuffle, sample } from './shuffle';

export const CATEGORIES = [
  'flagToName',
  'nameToFlag',
  'capitalToName',
  'nameToCapital',
  'nameToPopulation',
  'nameToLanguage',
];

const FIELD_FILTERS = {
  flagToName: () => true,
  nameToFlag: () => true,
  capitalToName: (c) => Boolean(c.capital),
  nameToCapital: (c) => Boolean(c.capital),
  nameToPopulation: (c) => c.population != null,
  nameToLanguage: (c) => c.languages.length > 0,
};

// Population-question distractor "closeness": window of ranks (in the
// pool sorted by population) to draw distractors from, per difficulty.
const POPULATION_WINDOW = { easy: Infinity, medium: 35, hard: 8 };

function distributeSlots(categories, count) {
  const base = Math.floor(count / categories.length);
  const remainder = count - base * categories.length;
  const counts = categories.map((_, i) => base + (i < remainder ? 1 : 0));
  const slots = [];
  categories.forEach((cat, i) => {
    for (let n = 0; n < counts[i]; n++) slots.push(cat);
  });
  return shuffle(slots);
}

function pickSubject(pool, usedCodes) {
  const available = pool.filter((c) => !usedCodes.has(c.cca3));
  const source = available.length > 0 ? available : pool;
  return source[Math.floor(Math.random() * source.length)];
}

function buildPopulationDistractors(subject, pool, difficulty) {
  const sorted = [...pool]
    .filter((c) => c.population != null)
    .sort((a, b) => a.population - b.population);
  const idx = sorted.findIndex((c) => c.cca3 === subject.cca3);
  const window = POPULATION_WINDOW[difficulty] ?? POPULATION_WINDOW.hard;
  const candidates =
    window === Infinity
      ? sorted.filter((c) => c.cca3 !== subject.cca3)
      : sorted.filter((c, i) => c.cca3 !== subject.cca3 && Math.abs(i - idx) <= window);

  const chosen = sample(candidates, 3).map((c) => c.population);
  const values = new Set([subject.population, ...chosen]);
  // Backfill from the whole sorted list if the close window didn't yield
  // three distinct values (only possible in very small pools).
  let fallbackPool = sorted.filter((c) => c.cca3 !== subject.cca3);
  while (values.size < 4 && fallbackPool.length > 0) {
    const pick = fallbackPool[Math.floor(Math.random() * fallbackPool.length)];
    fallbackPool = fallbackPool.filter((c) => c !== pick);
    values.add(pick.population);
  }
  return [...values].filter((v) => v !== subject.population).slice(0, 3);
}

function buildLanguageDistractors(subject, pool) {
  const subjectCodes = new Set(subject.languages.map((l) => l.code));
  const allOther = pool
    .filter((c) => c.cca3 !== subject.cca3)
    .flatMap((c) => c.languages)
    .filter((l) => !subjectCodes.has(l.code));
  const seen = new Set();
  const unique = [];
  for (const l of shuffle(allOther)) {
    if (!seen.has(l.code)) {
      seen.add(l.code);
      unique.push(l);
    }
    if (unique.length === 3) break;
  }
  return unique;
}

function buildQuestion(category, subject, pool, difficulty, lang) {
  const name = getCountryName(subject, lang);

  switch (category) {
    case 'flagToName': {
      const distractors = sample(pool, 3, [subject]).map((c) => getCountryName(c, lang));
      const options = shuffle([name, ...distractors]);
      return { category, countryCode: subject.cca3, flag: subject.flag, options, correctAnswer: name };
    }
    case 'nameToFlag': {
      const distractors = sample(pool, 3, [subject]).map((c) => c.flag);
      const options = shuffle([subject.flag, ...distractors]);
      return { category, countryCode: subject.cca3, countryName: name, options, correctAnswer: subject.flag };
    }
    case 'capitalToName': {
      const distractors = sample(pool, 3, [subject]).map((c) => getCountryName(c, lang));
      const options = shuffle([name, ...distractors]);
      return { category, countryCode: subject.cca3, capital: subject.capital, options, correctAnswer: name };
    }
    case 'nameToCapital': {
      const eligible = pool.filter((c) => c.capital);
      const distractors = sample(eligible, 3, [subject]).map((c) => c.capital);
      const options = shuffle([subject.capital, ...distractors]);
      return { category, countryCode: subject.cca3, countryName: name, options, correctAnswer: subject.capital };
    }
    case 'nameToPopulation': {
      const distractors = buildPopulationDistractors(subject, pool, difficulty);
      const options = shuffle([subject.population, ...distractors]);
      return {
        category,
        countryCode: subject.cca3,
        countryName: name,
        options,
        correctAnswer: subject.population,
      };
    }
    case 'nameToLanguage': {
      const correctLang = subject.languages[Math.floor(Math.random() * subject.languages.length)];
      const correctName = getLanguageName(correctLang, lang);
      const distractors = buildLanguageDistractors(subject, pool).map((l) => getLanguageName(l, lang));
      const options = shuffle([correctName, ...distractors]);
      return { category, countryCode: subject.cca3, countryName: name, options, correctAnswer: correctName };
    }
    default:
      throw new Error(`Unknown category: ${category}`);
  }
}

export function generateRound({ categories, region, difficulty, count, lang }) {
  const cats = categories.includes('mixed') ? CATEGORIES : categories;
  const slots = distributeSlots(cats, count);

  const basePool = buildSubjectPool(region, difficulty, count, () => true);
  const poolsByCategory = Object.fromEntries(
    cats.map((cat) => [cat, buildSubjectPool(region, difficulty, count, FIELD_FILTERS[cat])]),
  );

  const usedCodes = new Set();
  const questions = slots.map((category) => {
    const pool = poolsByCategory[category];
    const subject = pickSubject(pool, usedCodes);
    usedCodes.add(subject.cca3);
    // Distractors are drawn from the broader base pool (falling back to the
    // category pool) so small regions/categories still have enough variety.
    const distractorPool = basePool.length >= 4 ? basePool : pool;
    return buildQuestion(category, subject, distractorPool, difficulty, lang);
  });

  return questions;
}
