# Сфери · Spheres — clarified plan

Source: the agent plan PDF (24 Oct 2026) + the Claude Design handoff (`design/`).
This file records how the two were reconciled and what is built in which order.

## What changed vs. the PDF

| Topic | PDF | Now | Why |
|---|---|---|---|
| Default domains | 8 (family, body, partner, work, people, mind, growth, joy) | **10** (sleep, body, mood, relationships, work, growth, leisure, money, home, nature) | Chosen by Andrew in the design brief (`design/DESIGN_CHANGES.md` §1). Only `config.json` defaults change; the entry schema is untouched. Logged as CHANGES.md #1. |
| Illustrations | 12 | 14 (10 domains + 4 states) | Follows from 10 domains. Delivered in the design bundle. |
| Daily flow | One Today screen | **Today** (steps 1–2: mood + domains) → optional **Check-in** (steps 3–5: inner state → energy & sleep → highlight & note) | The design shows a "Крок 3 з 5" check-in screen for inner state; steps 1–2 are the Today screen. Keeps the required path to one tap + save. |
| Saving | "Save" button | Auto-save locally ~0.4 s after any change once mood is set; "Зберегти день" flushes and shows the saved state | A phone app that "never loses data". The button stays as the ritual close. |
| Users | Single user | **Several users per device** (one-time picker, avatar switcher, Settings → Користувачі); each with separate local data and a separate folder in the data repo | Requested by Andrew after the MVP. CHANGES.md #4. |
| Repo layout | `spheres/` | This repo (`daily-mood-and-habbits`) is the app repo; Pages base path `/daily-mood-and-habbits/` | Repo already exists. |

## Phases (unchanged gates)

- **Phase 0 · Specs** — data contract v1 is implemented in `src/model/schema.ts`.
  Psychology deliverables (`PSYCH_SPEC.md`, `questions.*.json`, `INSIGHTS_SPEC.md`) are **still open**;
  until then the question wording comes from the design's strings (`src/i18n/*.json`).
  ⛳ Gate: Andrew approves the contract + CHANGES.md #1–#3.
- **Phase 1 · Foundations** ✅ repo skeleton, Pages deploy workflow, Dexie store, i18n, tokens, components.
- **Phase 2 · Today = MVP** ✅ (first cut) logging flow, domain sheet, check-in, GitHub sync, CSV/JSON export + restore, history calendar, settings.
  ⛳ Gate: 7 days of real use on the iPhone.
- **Phase 3 · Insights** ✅ charts + insight cards from the analytics spec, empty/low-data states (`src/analytics/`, `src/routes/Insights.tsx`).
  Charts are hand-drawn SVG in the design tokens instead of ECharts: no extra ~300 KB download, and they match the cards.
- **Phase 4 · Ritual & polish** — Sunday review (designed: screen 05), therapist summary, `/styleguide` route, a11y + reduced-motion pass.

## MVP definition of done — status

- [ ] Full day logged in ≤ 90 s one-handed on iPhone Chrome — *needs a real-device check*
- [x] Works offline; offline edits sync when back online (IndexedDB + dirty queue; unit-tested)
- [x] Reinstall restores every entry from the data repo (unit-tested against a fake Contents API)
- [x] UA/EN switch without reload; all strings in `src/i18n/*.json`
- [ ] Installs to Home Screen, opens standalone; deploys to Pages on push to `main` — *needs Pages enabled + a real-device check*
- [x] Insight rules run on 0/3/30/365 days of data (unit-tested); charts checked in the browser with 0, 3 and 60 days

## Open decisions for Andrew

1. Approve CHANGES.md #1 (10 domains) — the build already uses them.
2. CHANGES.md #2: the «Сон»/«Настрій» domain cards overlap the top-level `sleep`/`mood` fields. Built as independent for now (matches the mockup, where the Настрій card is empty while mood = 4).
3. Final app name (working title «Сфери · Spheres»).
4. Encrypt the data repo (v1.1 toggle) or keep readable JSON — readable for now.
5. Lifeline Ukraine 7333 checked on 28 Oct 2026 (free, 24/7); 112 added for emergencies. Re-check now and then: the line has asked publicly for funding.
