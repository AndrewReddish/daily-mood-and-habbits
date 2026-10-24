# Architecture

Offline-first PWA on GitHub Pages; entries sync to a **separate private GitHub repo** used as the database.
The app repo is public (free Pages); the diary never touches it.

## Stack
- **Vite + Preact + TypeScript**, hash routing (`#/today`, `#/day/2026-10-22`, `#/checkin/<date>/<3..5>`, `#/history`, `#/insights`, `#/settings`) — Pages has no SPA fallback.
- **Dexie (IndexedDB)** with **Zod** validation on every read and write (`src/storage/db.ts`).
- **vite-plugin-pwa**: `display: standalone`, apple-touch-icon, offline precache of the shell, icons and illustrations.
- **i18n**: `src/i18n/uk.json` (default) + `en.json`, `t()` via context so switching needs no reload. `Intl` for dates (weeks start Monday).
- **Design**: `src/styles/tokens.css` is the design bundle's file verbatim; `components.css` follows the mockup values in `design/Spheres Screens.dc.html`. Icons: `public/icons.svg` sprite; illustrations: `public/illustrations/*.svg`.

## Data flow
```
UI ──update()──▶ useDay (400 ms debounce) ──▶ Dexie: entries + dirty{path}
                                               │
                         schedulePush (3 s) ───┴──▶ sync-github.pushDirty ──▶ GitHub Contents API
app open / back online ─────────────────────────▶ sync-github.pullAll  ◀──┘
```
- **Merge**: per day (or per week / whole config), newer `updatedAt` wins, compared as instants. Ties keep local.
- **Conflicts**: a PUT with a stale `sha` (409/422) re-pulls, re-merges and retries (max 2).
- **Deletes**: not supported in v1 (no tombstones). Clearing a day isn't a UI action yet.
- Pull runs on open, on `online`; push runs 3 s after the last edit and immediately when the app is hidden.

## Privacy
- The token is a fine-grained PAT scoped to the data repo (Contents: read/write). Stored only in IndexedDB on the device, sent only to `api.github.com`, never logged, never exported.
- No analytics, no third-party requests except Google Fonts (CSS + font files).

## iOS details handled
`viewport-fit=cover` + `env(safe-area-inset-*)`; inputs ≥ 16 px; `100dvh`; no hover-only states; no `navigator.vibrate`; first-visit install hint (Share → Add to Home Screen) on iOS when not standalone.

## Layout
```
src/
  routes/      Today, CheckIn, History, Insights (placeholder), Settings
  components/  ui.tsx (Icon, Button, MoodPicker, BloomRating, Slider, Chip, Sheet, TabBar…), domain.tsx, InstallHint
  model/       schema.ts (Zod, contract v1), types.ts, defaults.ts
  storage/     db.ts, merge.ts, sync-github.ts, sync.ts (scheduler), export.ts
  lib/         dates.ts, router.ts, useDay.ts, useConfig.ts, useOnline.ts
  i18n/        uk.json, en.json, t.ts
  styles/      tokens.css (design), components.css, app.css
public/        icons.svg, illustrations/, app icons
design/        handoff from Claude Design (reference only)
tests/unit/    Vitest: merge, schema, dates, export, sync (fake Contents API)
```

## Not yet done
- Playwright e2e on WebKit at 390×844 and a Lighthouse PWA run (Phase 2 deliverable).
- `/styleguide` route (exists in the design bundle; port in Phase 4).
