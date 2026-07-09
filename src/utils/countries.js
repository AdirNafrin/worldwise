import rawCountries from '../data/countries.json';

export const REGIONS = ['Africa', 'Americas', 'Asia', 'Europe', 'Oceania'];

export const ALL_COUNTRIES = rawCountries;

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

const TIER_SIZES = { easy: 55, medium: 140, hard: ALL_COUNTRIES.length };

export function familiarityPool(difficulty) {
  const size = TIER_SIZES[difficulty] ?? TIER_SIZES.hard;
  return byPopulationDesc.slice(0, size);
}

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
  for (let i = startIdx; i < order.length; i++) {
    const pool = filterByRegion(familiarityPool(order[i]), region).filter(
      fieldFilter || (() => true),
    );
    if (pool.length >= minCount || i === order.length - 1) return pool;
  }
  return filterByRegion(ALL_COUNTRIES, region).filter(fieldFilter || (() => true));
}

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
      const formatted = num >= 100 ? Math.round(num) : Math.round(num * 10) / 10;
      return `${formatted}${suffix}`;
    }
  }
  return String(value);
}

export function formatArea(value, lang) {
  if (value == null) return '—';
  const km2 = lang === 'he' ? 'קמ"ר' : 'km²';
  if (value >= 1000) {
    return `${Math.round(value).toLocaleString(lang === 'he' ? 'he-IL' : 'en-US')} ${km2}`;
  }
  return `${value} ${km2}`;
}
