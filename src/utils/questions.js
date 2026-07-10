import { buildSubjectPool, getCountryName, getRegionName, REGIONS } from './countries';
import { getLanguageName } from './languages';
import { shuffle, sample } from './shuffle';

// The trivia categories from the spec, plus "country -> continent". "mixed"
// is handled separately (see generateRound) rather than living in this
// list, since it isn't a question type of its own - it's "use all of
// these, evenly distributed".
export const CATEGORIES = [
  'flagToName',
  'nameToFlag',
  'capitalToName',
  'nameToCapital',
  'nameToPopulation',
  'nameToLanguage',
  'nameToRegion',
];

// Not every country can be the *subject* of every category - e.g. a
// country with no recorded capital can't be asked about in a capital
// question. These filters keep such countries eligible for every other
// category while excluding them only where the missing field matters.
const FIELD_FILTERS = {
  flagToName: () => true,
  nameToFlag: () => true,
  capitalToName: (c) => Boolean(c.capital),
  nameToCapital: (c) => Boolean(c.capital),
  nameToPopulation: (c) => c.population != null,
  nameToLanguage: (c) => c.languages.length > 0,
  // A handful of territories (Antarctica etc.) fall outside the 5
  // real regions and can't be quizzed on "which continent".
  nameToRegion: (c) => REGIONS.includes(c.region),
};

// "Which continent" only makes sense across the whole world - if the
// player filtered to a single region, every subject would trivially share
// the same correct answer. This category ignores the region filter
// entirely and always draws from every country.
const IGNORES_REGION_FILTER = new Set(['nameToRegion']);

// Population-question distractor "closeness": window of ranks (in the
// pool sorted by population) to draw distractors from, per difficulty.
const POPULATION_WINDOW = { easy: Infinity, medium: 35, hard: 8 };

// Splits `count` questions as evenly as possible across `categories` (used
// for "mixed" mode - e.g. 20 questions over 6 categories becomes four
// 4-question groups and two 3-question groups), then shuffles the result
// so same-category questions aren't clumped together in the round.
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

// Picks a random country from `pool` to be the next question's subject,
// preferring ones not already used earlier in the round (the spec's
// no-repeat-country rule). Falls back to allowing a repeat only if every
// country in the pool has already been used (e.g. a very long practice
// session that's exhausted a small region's country list).
function pickSubject(pool, usedCodes) {
  const available = pool.filter((c) => !usedCodes.has(c.cca3));
  const source = available.length > 0 ? available : pool;
  return source[Math.floor(Math.random() * source.length)];
}

// Builds the 3 wrong-answer population figures for a "country -> population"
// question. Distractors are drawn from countries whose rank (in a
// population-sorted list) is within POPULATION_WINDOW of the subject's own
// rank, so "hard" pulls very close (easily-confused) numbers and "easy"
// pulls from anywhere (obviously-wrong numbers).
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

// Builds the 3 wrong-answer languages for a "country -> language" question.
// Explicitly excludes every one of the subject's own official languages
// (per the spec: a distractor must never itself be a correct answer for
// that country), and de-duplicates so the same language can't appear twice.
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

// Builds one complete question object for `subject` in the given
// `category`: the prompt data to display, the 4 shuffled options, and
// which option is correct. `pool` supplies the distractor candidates.
function buildQuestion(category, subject, pool, difficulty, lang) {
  const name = getCountryName(subject, lang);

  switch (category) {
    // Show a flag, ask which country it belongs to.
    case 'flagToName': {
      const distractors = sample(pool, 3, [subject]).map((c) => getCountryName(c, lang));
      const options = shuffle([name, ...distractors]);
      return { category, countryCode: subject.cca3, flag: subject.flag, options, correctAnswer: name };
    }
    // Show a country name, ask which of 4 flag images is correct.
    case 'nameToFlag': {
      const distractors = sample(pool, 3, [subject]).map((c) => c.flag);
      const options = shuffle([subject.flag, ...distractors]);
      return { category, countryCode: subject.cca3, countryName: name, options, correctAnswer: subject.flag };
    }
    // Show a capital city, ask which country it's the capital of.
    case 'capitalToName': {
      const distractors = sample(pool, 3, [subject]).map((c) => getCountryName(c, lang));
      const options = shuffle([name, ...distractors]);
      return { category, countryCode: subject.cca3, capital: subject.capital, options, correctAnswer: name };
    }
    // Show a country name, ask for its capital city. Distractor capitals
    // are only drawn from countries that actually have one on record.
    case 'nameToCapital': {
      const eligible = pool.filter((c) => c.capital);
      const distractors = sample(eligible, 3, [subject]).map((c) => c.capital);
      const options = shuffle([subject.capital, ...distractors]);
      return { category, countryCode: subject.cca3, countryName: name, options, correctAnswer: subject.capital };
    }
    // Show a country name, ask for its (formatted) population.
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
    // Show a country name, ask for one of its official languages (picked
    // at random when a country has more than one).
    case 'nameToLanguage': {
      const correctLang = subject.languages[Math.floor(Math.random() * subject.languages.length)];
      const correctName = getLanguageName(correctLang, lang);
      const distractors = buildLanguageDistractors(subject, pool).map((l) => getLanguageName(l, lang));
      const options = shuffle([correctName, ...distractors]);
      return { category, countryCode: subject.cca3, countryName: name, options, correctAnswer: correctName };
    }
    // Show a country name, ask which continent/region it's in. Distractors
    // come from the fixed 5-region list rather than from other countries.
    case 'nameToRegion': {
      const correctName = getRegionName(subject.region, lang);
      const distractors = sample(
        REGIONS.filter((r) => r !== subject.region),
        3,
      ).map((r) => getRegionName(r, lang));
      const options = shuffle([correctName, ...distractors]);
      return { category, countryCode: subject.cca3, countryName: name, options, correctAnswer: correctName };
    }
    default:
      throw new Error(`Unknown category: ${category}`);
  }
}

// Generates a full round of questions for the given setup (categories,
// region, difficulty, how many questions, and display language). This is
// the single entry point Game.jsx calls, both for the upfront 20-question
// normal round and for each extra batch fetched during practice mode.
export function generateRound({ categories, region, difficulty, count, lang }) {
  // "mixed" expands to every category; otherwise it's just the one chosen category.
  const cats = categories.includes('mixed') ? CATEGORIES : categories;
  const slots = distributeSlots(cats, count);

  // basePool: eligible subjects ignoring category-specific field
  // requirements, used as the general distractor source. poolsByCategory:
  // per-category eligible *subjects*, respecting each category's field filter.
  const basePool = buildSubjectPool(region, difficulty, count, () => true);
  const poolsByCategory = Object.fromEntries(
    cats.map((cat) => [
      cat,
      buildSubjectPool(
        IGNORES_REGION_FILTER.has(cat) ? 'all' : region,
        difficulty,
        count,
        FIELD_FILTERS[cat],
      ),
    ]),
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
