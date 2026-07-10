# WorldWise — project notes for Claude

This file exists so a *future* Claude Code session (a new session, a new
project, or even a different agent) can pick up full context on this
project without re-deriving decisions or re-discovering gotchas that were
already solved. It captures decisions made in chat that never made it into
code comments or commit messages, plus known environment quirks. Keep this
file updated when you make a non-obvious decision the same way you'd want
a future session to know about it.

## What this is

WorldWise is a Hebrew/English trivia PWA about world countries (flags,
capitals, population, languages, continents). No backend — pure static
React SPA, all personal data (stats/settings) stays in each player's own
browser localStorage. Built from a detailed Hebrew spec the user provided
at project start; see git history for the original commit if the spec
itself is needed again.

**Live deployment:** Vercel project connected to this repo, auto-deploys
`main` on every push. The user has the URL; ask them if you need it rather
than guessing — it changes if they ever rename the Vercel project.

## Repo / git — READ THIS BEFORE PUSHING

- **The GitHub repo is `AdirNafrin/worldwise`, NOT `AdirNafrin/soccer`.**
  This session/environment was originally provisioned against a repo
  named `soccer` (an old placeholder name), and the sandbox's git identity
  is tied to that. The user asked for the real project to live in a
  separate `worldwise` repo instead, created after the fact.
- **Gotcha, already hit twice:** the local `origin` remote gets silently
  reset back to `https://github.com/AdirNafrin/soccer` between sessions
  (something about how this environment re-syncs git config against its
  original provisioning target). Before pushing, always check:
  ```
  git remote -v
  ```
  If `origin` points at `soccer`, fix it:
  ```
  git remote remove origin
  git remote add origin https://github.com/AdirNafrin/worldwise.git
  ```
- Push target: `git push origin <branch>:main` — `worldwise`'s default
  branch is `main`. The working branch in this sandbox is typically named
  something like `claude/worldwise-trivia-app-*`; push its content to
  `worldwise`'s `main`, don't worry about matching branch names.
- The GitHub App integration available in this environment can **read/write
  existing repos it's been granted access to, but cannot create or delete
  repos** (no Administration permission). If a new repo is ever needed,
  the user has to create the empty repo manually on github.com first.
- `soccer` (the original repo) has been intentionally abandoned — all
  local git remotes pointing at it were removed. Don't resurrect it.
- The local working directory was originally `/home/user/soccer` (matching
  the sandbox's original provisioning) and was renamed to
  `/home/user/worldwise` at the user's request, purely for local
  cleanliness (it isn't visible to anyone, but they wanted it to stop
  saying "soccer" anywhere, including on disk). If a fresh session's
  system prompt still shows `/home/user/soccer` as the "primary working
  directory," that's just stale environment metadata — check `pwd` /
  `ls /home/user` for the real current path rather than trusting that label.

## Environment quirks worth knowing

- **This sandbox cannot reach `restcountries.com`** (org egress policy
  blocks it at the proxy level, independent of any API key). This is why
  `scripts/fetchCountries.mjs` builds `src/data/countries.json` from
  offline npm datasets (`world-countries`, `i18n-iso-countries`,
  `country-json`) instead of a live API call. See the script's own header
  comment for details. If a future session has real internet access and
  wants fresher data, it's fine to rewrite the script to hit the live API
  — just keep the output shape (`src/data/countries.json` fields) identical
  so nothing downstream needs to change.
- **This sandbox also cannot reach the live Vercel deployment**
  (`*.vercel.app`) — same class of egress block, confirmed with both
  `curl` and a real headless Chromium (Playwright), not just simple HTTP
  tools. A `WebFetch` call to the Vercel URL returns a 403 from the actual
  server rather than a proxy error, which looks like a real problem but
  isn't confirmed to be one — treat it as inconclusive, not proof of
  breakage, and ask the user to check the live URL themselves rather than
  trying repeatedly to prove it end-to-end from here.
- Local verification pattern that works well in this repo: `npm run
  build`, then `npm run preview -- --port 4173 --host` in the background,
  then drive it with Playwright + the pre-installed Chromium at
  `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` (see any recent
  commit's session for example test scripts). This has caught several real
  bugs (see below) that would have shipped otherwise — don't skip it for
  nontrivial changes.

## Architecture decisions (the "why")

- **Data router (`createBrowserRouter`/`RouterProvider`), not
  `<BrowserRouter>`/`<Routes>`.** Needed for `useBlocker` in `Game.jsx`,
  which intercepts the browser/OS back gesture mid-round and shows the
  same "quit round?" confirmation the in-app ✕ button shows. An earlier
  attempt hand-rolled this with raw `window.history.pushState` +
  `popstate` listeners; it looked plausible but silently broke because
  raw history calls fight React Router's own internal history
  bookkeeping. `useBlocker` is the supported mechanism — don't go back to
  the manual approach.
- **Sound effects are synthesized with Web Audio API oscillators**
  (`src/hooks/useSound.js`), not audio files. No assets to manage, tiny
  bundle impact.
- **"Country → Continent" (`nameToRegion`) ignores the region filter**
  and always draws subjects from the whole world, even if the player
  filtered to e.g. "Europe" — otherwise every question in that category
  would trivially have the same correct answer. See
  `IGNORES_REGION_FILTER` in `src/utils/questions.js`.
- **Difficulty affects two things**, not just distractor wording: (1)
  which countries can be the subject at all (familiarity tiers by
  population rank, see `src/utils/countries.js`), and (2) for population
  questions specifically, how numerically close the wrong answers are
  (rank-distance window, see `src/utils/questions.js`).
- **"Play again" restarts the same config directly** (same
  category/region/difficulty/mode), bypassing the setup screen. "Back to
  home" is the only way back to the setup/menu flow. This was an explicit
  user preference, not the original default behavior.
- **Country → Flag answers render as a 2x2 grid**, not one-per-row like
  the other categories (`Game.jsx`, the options `<div>` gets `grid-cols-2`
  only when `question.category === 'nameToFlag'`). Explicit user request
  for better use of screen width. The flag boxes themselves size via
  `aspect-[8/5]` + `max-w-40` rather than a fixed pixel width, so they
  shrink correctly inside a 2-column grid on narrow phones instead of
  overflowing their column - don't go back to fixed `w-32`/`h-20`, that's
  what caused the original stretched-flag bug this replaced.
- Full list of trivia categories lives in `CATEGORIES` in
  `src/utils/questions.js` — currently 7 (flag↔name, capital↔name,
  name→population, name→language, name→continent) plus "mixed". Adding an
  8th category is mostly mechanical: add to `CATEGORIES`, a
  `FIELD_FILTERS` entry, a case in `buildQuestion`, i18n keys
  (`category.X`, `category.X.desc`, a `game.whatIsX` prompt string), a
  `QuestionPrompt` case in `Game.jsx`, and a `CATEGORY_ICON` entry in
  `GameSetup.jsx`. Stats/mixed-mode pick it up automatically — no changes
  needed there.

## User preferences learned this session

- Prefers being **shown visual proof** (screenshots) before/after UI
  changes rather than just told it's done.
- Wants **inline code comments explaining what each section does**
  (not the terse "only comment the non-obvious" default) — this was an
  explicit, deliberate ask, overriding the usual minimal-comment
  convention. Keep doing this for new code in this repo specifically.
- Prefers **exploratory/big decisions presented as clickable
  options** (`AskUserQuestion`) over free-text questions where possible.
- Is not a heavy technical user — explain git/GitHub/Vercel/App Store
  concepts in plain terms, don't assume familiarity.
- Communicates in Hebrew; respond in Hebrew for chat, keep code/comments/
  commit messages in English.

## Audio

- Beyond the original single correct/wrong tone pair, there are now **4
  selectable sound themes** (`SOUND_THEMES` in `src/hooks/useSound.js`:
  classic/arcade/chime/marimba), each just a different sequence of
  `beep()` calls (waveform/pitch/timing) — still zero audio assets.
  Persisted as `settings.soundTheme`. The Settings screen's preview (▶)
  button plays a theme *regardless of the mute setting*, on purpose, so
  users can audition options while muted — don't "fix" that into
  respecting mute.

## Responsive design

- The app targets phone/tablet/desktop, web + installed PWA, iOS + Android,
  all in one responsive layout (no separate mobile/desktop codepaths).
- Verification pattern used and worth reusing after any layout change:
  spin up the preview server, then loop Playwright across viewport widths
  **320 to 1920px** (at least 320/360/375/390/412/430/768/1024/1280/1366/1920
  to cover old small phones through iPad landscape and desktop) and assert
  `document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1`
  on every page/state (including Hebrew RTL, and short/landscape phone
  heights like 667x375) — cheap to run, catches horizontal-overflow
  regressions immediately. Also worth a real visual screenshot at the
  narrowest width (320px) since "no overflow" doesn't guarantee
  "readable."
- This is exactly how a real bug was found: on short viewports (phone
  landscape, or an old small phone), the Settings sheet had no
  `max-height`, so its content — including its own close button — could
  grow taller than the screen with no way to scroll back up to it. Fixed
  with `max-h-[85vh] overflow-y-auto` on the sheet card. Any new fixed/
  modal overlay should get the same treatment up front rather than
  waiting to rediscover this.

## Open / unresolved items

- No repo secrets, API keys, or analytics of any kind are present by
  design (verified via grep + `npm audit` when the user asked about
  security before sharing the app with friends) — keep it that way unless
  explicitly asked otherwise.

## Theming (color palette + hover)

- The 4 candidate palettes from the early design artifact were never
  picked as a single default — instead, per the user's request, **all 4
  shipped as a persistent Settings option** (`settings.palette`), the
  same way light/dark mode works. Default is `atlas` (the original
  blue/violet look).
- Every accent color (buttons, selected states, timer bar, score,
  gradient title) reads from CSS custom properties defined per palette
  in `src/index.css` under `[data-palette='X']` blocks, applied via a
  `data-palette` attribute on `<html>` (`SettingsContext.jsx`, mirroring
  how the `dark` class works). **When adding new UI that needs an accent
  color, use `bg-[var(--accent)]` etc., never a hardcoded Tailwind color
  like `bg-blue-600`** — the whole point is that every palette re-themes
  it automatically. See `src/index.css` for the full token list
  (`--accent`, `--accent-hover`, `--accent-text-dark`, `--accent-2`,
  `--accent-soft`, `--bg-top`/`--bg-bottom` + dark variants).
- Category badge colors (`CATEGORY_ICON` in `GameSetup.jsx`) and
  difficulty colors (green/amber/red) are deliberately *not* tied to the
  palette — they're semantic/identity colors, not brand accent.
- Buttons/cards/pills have a hover lift+shadow micro-interaction
  (`hover:-translate-y-0.5 hover:shadow-*`), gated by
  `prefers-reduced-motion` in `index.css`. Destructive actions (reset
  progress) intentionally don't get this — a plain color change only.
