# WorldWise

A responsive trivia web app (installable as a PWA) that teaches world
geography — flags, capitals, populations, areas, and official languages —
through short, timed multiple-choice rounds. Hebrew and English, RTL/LTR,
light/dark, fully offline-capable.

No backend: country data is fetched once at build time and shipped as a
static JSON file in the repo.

## Features

- 6 trivia categories (flag↔country, capital↔country, country→population,
  country→language) plus a "mixed" mode
- Easy / medium / hard difficulty, affecting distractor closeness and which
  countries are in play
- Region filter (Africa, Americas, Asia, Europe, Oceania, or the whole world)
- Normal mode (20 questions, timer, 3 lives, scoring with speed/streak
  bonuses) and untimed Practice mode with extended country facts after every
  answer
- Full round review screen (every question, your answer, the correct answer)
- Personal stats saved locally: history, accuracy by category, hardest
  countries
- Hebrew + English with automatic browser-language detection, full RTL
  support, dark/light theme, mutable sound effects, custom install banner
- Installable PWA with offline support (service worker + cached flag assets)

## Tech stack

React 19 (hooks, function components), Vite, React Router, Tailwind CSS 4,
vite-plugin-pwa. No backend, no analytics, no external runtime API calls.

## Getting started

```bash
npm install
npm run dev
```

```bash
npm run build     # production build to dist/
npm run preview   # preview the production build
npm run lint      # oxlint
```

## Country data

`src/data/countries.json` and the flag SVGs in `public/flags/` are generated
once by `scripts/fetchCountries.mjs` from offline, MIT/ODbL-licensed npm
datasets ([world-countries](https://www.npmjs.com/package/world-countries),
[i18n-iso-countries](https://www.npmjs.com/package/i18n-iso-countries) for
Hebrew names, [country-json](https://www.npmjs.com/package/country-json) for
population) rather than a live call to the REST Countries API, since that API
now requires a personal key and this project has no server-side secret store.
Regenerate it any time with:

```bash
npm run fetch:countries
```

The PWA icon set (`public/icons/`, `public/favicon.svg`) is generated from an
inline SVG by `scripts/generateIcons.mjs` (needs `sharp`, already a
devDependency).

## Project structure

```
src/
  components/  reusable UI (answer buttons, timer bar, dialogs, top bar...)
  context/     Settings (theme/sound/timer) and Stats (localStorage) providers
  data/        generated countries.json
  hooks/       useTimer, useSound
  i18n/        en/he dictionaries + language-name translations + provider
  pages/       Home, GameSetup, Game, Results, Stats
  utils/       question generator, country/region/difficulty helpers
scripts/       one-time data + icon generation scripts
```

## Deployment

Any static host works (Vercel, Netlify, GitHub Pages). On Vercel: import the
repo, framework preset "Vite", no environment variables needed.

## License

MIT
