import rawCountries from '../data/countries.json';

// The 5 regions offered as a filter in the UI (matches the spec exactly -
// no split of North/South America, and a handful of uninhabited
// territories fall outside all 5 and only appear under "whole world").
export const REGIONS = ['Africa', 'Americas', 'Asia', 'Europe', 'Oceania'];

// The full generated dataset (see scripts/fetchCountries.mjs), loaded once
// and reused everywhere rather than re-imported/re-parsed per component.
export const ALL_COUNTRIES = rawCountries;

// Returns a country's name in the requested UI language.
export function getCountryName(country, lang) {
  return lang === 'he' ? country.nameHe : country.nameEn;
}

// Countries ranked by population, most populous first. Countries with no
// population figure (a handful of uninhabited territories) are appended at
// the end, so they only ever surface in the largest ("hard") tier.
const byPopulationDesc = [...ALL_COUNTRIES].sort((a, b) => {
  if (a.population == null && b.population == null) return 0;
  if (a.population == null) return 1;
  if (b.population == null) return -1;
  return b.population - a.population;
});

// How many of the most-populous countries make up each difficulty's pool.
// Population is used purely as a rough proxy for "how well-known is this
// country", not as a fact tested on its own difficulty axis.
const TIER_SIZES = { easy: 55, medium: 140, hard: ALL_COUNTRIES.length };

// Returns the pool of countries eligible to be asked about at a given
// difficulty: easy sticks to the most populous/familiar countries, hard
// opens up to the full list including obscure territories.
export function familiarityPool(difficulty) {
  const size = TIER_SIZES[difficulty] ?? TIER_SIZES.hard;
  return byPopulationDesc.slice(0, size);
}

// Narrows a list of countries down to one region, or returns it unchanged
// for the "whole world" option.
export function filterByRegion(countries, region) {
  if (!region || region === 'all') return countries;
  return countries.filter((c) => c.region === region);
}

// Builds the subject pool for a round: familiarity tier filtered by region,
// with progressive tier expansion if the intersection is too small to cover
// `minCount` unique countries (small regions at low difficulty).
export function buildSubjectPool(region, difficulty, minCount, fieldFilter) {
  const order = ['easy', 'medium', 'hard'];
  const startIdx = Math.max(order.indexOf(difficulty), 0);
  // Try the requested difficulty first, then progressively widen to the
  // next tier up until there are enough countries to fill the round
  // without repeats (e.g. Oceania at "easy" alone may be too small).
  for (let i = startIdx; i < order.length; i++) {
    const pool = filterByRegion(familiarityPool(order[i]), region).filter(
      fieldFilter || (() => true),
    );
    if (pool.length >= minCount || i === order.length - 1) return pool;
  }
  // Unreachable in practice (the loop above always returns on its last
  // iteration), kept only as a defensive fallback.
  return filterByRegion(ALL_COUNTRIES, region).filter(fieldFilter || (() => true));
}

// Formats a population number as a short, glanceable string ("8.9M" / "8.9
// מיליון") instead of the full digit count, per the spec's readability
// requirement for a fast-paced quiz UI.
export function formatPopulation(value, lang) {
  if (value == null) return '—';
  const units =
    lang === 'he'
      ? [
          [1e9, ' מיליארד'],
          [1e6, ' מיליון'],
          [1e3, ' אלף'],
        ]
      : [
          [1e9, 'B'],
          [1e6, 'M'],
          [1e3, 'K'],
        ];
  for (const [threshold, suffix] of units) {
    if (value >= threshold) {
      const num = value / threshold;
      // One decimal place below 100 (e.g. "8.9M"), whole numbers above it
      // (e.g. "340M") so the string doesn't get needlessly long.
      const formatted = num >= 100 ? Math.round(num) : Math.round(num * 10) / 10;
      return `${formatted}${suffix}`;
    }
  }
  return String(value);
}

// Formats an area in km², with thousands separators for large numbers.
export function formatArea(value, lang) {
  if (value == null) return '—';
  const km2 = lang === 'he' ? 'קמ"ר' : 'km²';
  if (value >= 1000) {
    return `${Math.round(value).toLocaleString(lang === 'he' ? 'he-IL' : 'en-US')} ${km2}`;
  }
  return `${value} ${km2}`;
}
