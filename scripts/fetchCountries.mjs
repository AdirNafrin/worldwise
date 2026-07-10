// One-time data build script (per project spec, section 3/12 step 2).
//
// The spec assumes a live call to REST Countries v5 (which now requires a
// personal API key). This sandbox's egress policy blocks restcountries.com
// entirely (proxy returns 403 at the CONNECT layer, independent of any key),
// so this script instead builds the same shape of data from three offline,
// MIT/ODbL-licensed npm datasets that mirror REST Countries content:
//   - world-countries  (name/capital/region/languages/area/flag emoji)
//   - i18n-iso-countries (CLDR-based Hebrew country names)
//   - country-json (population figures)
// Re-run with `npm run fetch:countries` if you want to refresh from newer
// versions of these packages. Output: src/data/countries.json + public/flags/*.svg.
import { writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import worldCountries from 'world-countries';
import countries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json' with { type: 'json' };
import heLocale from 'i18n-iso-countries/langs/he.json' with { type: 'json' };
import population from 'country-json/src/country-by-population.json' with { type: 'json' };

countries.registerLocale(enLocale);
countries.registerLocale(heLocale);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const flagsSrcDir = path.join(root, 'node_modules', 'world-countries', 'data');
const flagsOutDir = path.join(root, 'public', 'flags');
mkdirSync(flagsOutDir, { recursive: true });

// Aliases so population figures (keyed by common English name in the
// country-json dataset) join correctly against world-countries entries.
const POPULATION_NAME_ALIASES = {
  'DR Congo': 'The Democratic Republic of Congo',
  'Fiji': 'Fiji Islands',
  'Türkiye': 'Turkey',
  'French Southern and Antarctic Lands': 'French Southern territories',
};

// Countries/territories missing from the country-json dataset entirely.
// Figures are hand-filled best-known estimates (small territories, so
// precision matters less than simply not leaving the field empty).
const POPULATION_MANUAL = {
  XK: 1586659, // Kosovo
  TW: 23894394, // Taiwan
  GG: 63950, // Guernsey
  IM: 84069, // Isle of Man
  JE: 103267, // Jersey
  CW: 156783, // Curaçao
  SX: 43847, // Sint Maarten
  MF: 32077, // Saint Martin
  BL: 10994, // Saint Barthélemy
  AX: 30129, // Åland Islands
  BQ: 26200, // Caribbean Netherlands (Bonaire, Sint Eustatius, Saba)
};

// Hebrew names missing from the CLDR-derived i18n-iso-countries dataset
// (per spec 4: manual fallback when no Hebrew translation is available).
const HEBREW_NAME_FALLBACK = {
  XK: 'קוסובו',
  TW: 'טייוואן',
  VA: 'הכס הקדוש (וותיקן)',
  CW: 'קוראסאו',
  SX: 'סינט מארטן',
  MF: 'סן מארטן',
  BL: 'סן ברתלמי',
  BQ: 'האיים הקריביים ההולנדיים',
  XW: 'הגדה המערבית',
};

const popByName = new Map(population.map((p) => [p.country.toLowerCase(), p.population]));

// Finds a country's population in the country-json dataset, which is
// keyed by English country name rather than an ISO code. Tries the manual
// override table first, then the country's common/official names, the
// alias table, and finally all known alternate spellings, in that order.
function lookupPopulation(country) {
  if (POPULATION_MANUAL[country.cca2] !== undefined) return POPULATION_MANUAL[country.cca2];
  const candidates = [
    country.name.common,
    country.name.official,
    POPULATION_NAME_ALIASES[country.name.common],
    ...(country.altSpellings || []),
  ].filter(Boolean);
  for (const candidate of candidates) {
    const value = popByName.get(candidate.toLowerCase());
    if (value !== undefined) return value;
  }
  return null;
}

const REGIONS = new Set(['Africa', 'Americas', 'Asia', 'Europe', 'Oceania']);

// Builds one output record per country/territory: resolves its Hebrew
// name, capital, language list, and population from the sources above,
// and copies its flag SVG into public/ so the built app can serve it as a
// local static asset instead of depending on any external image host.
const result = worldCountries
  .map((country) => {
    const cca2 = country.cca2;
    const cca3 = country.cca3;
    const nameHe =
      HEBREW_NAME_FALLBACK[cca2] || countries.getName(cca2, 'he') || country.name.common;
    const capital = Array.isArray(country.capital) && country.capital.length > 0
      ? country.capital[0]
      : null;
    const languages = country.languages
      ? Object.entries(country.languages).map(([code, name]) => ({ code, name }))
      : [];
    const pop = lookupPopulation(country);

    const flagFile = `${cca3.toLowerCase()}.svg`;
    const svgSrc = path.join(flagsSrcDir, flagFile);
    if (existsSync(svgSrc)) {
      copyFileSync(svgSrc, path.join(flagsOutDir, flagFile));
    }

    return {
      cca2,
      cca3,
      nameEn: country.name.common,
      nameHe,
      capital,
      region: REGIONS.has(country.region) ? country.region : 'Other',
      subregion: country.subregion || null,
      population: pop && pop > 0 ? pop : null,
      area: typeof country.area === 'number' ? country.area : null,
      languages,
      flag: existsSync(svgSrc) ? `/flags/${flagFile}` : null,
      independent: Boolean(country.independent),
      unMember: Boolean(country.unMember),
    };
  })
  .filter((c) => c.flag) // drop entries we have no flag asset for
  .sort((a, b) => a.nameEn.localeCompare(b.nameEn));

const outPath = path.join(root, 'src', 'data', 'countries.json');
writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n');

console.log(`Wrote ${result.length} countries to ${path.relative(root, outPath)}`);
console.log(`Copied flag SVGs to ${path.relative(root, flagsOutDir)}`);
console.log(`Missing population: ${result.filter((c) => c.population == null).length}`);
console.log(`Missing capital: ${result.filter((c) => c.capital == null).length}`);
