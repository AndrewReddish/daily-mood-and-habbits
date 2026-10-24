# CHANGES — data-contract proposals

Rule: nobody changes the contract alone. Each item waits for Andrew's approval.

## #1 Default domains → 10 *(proposed by design; already used in the build — awaiting sign-off)*
`config.json` defaults become: sleep, body, mood, relationships, work, growth, leisure, money, home, nature
(see `design/DESIGN_CHANGES.md`). Entry schema unchanged: `domains` is still keyed by domain id.
Domain `icon` holds a sprite id (`d-sleep`), `color` holds a palette id from `tokens.css` (`sleep` → `--d-sleep`).
Custom domains get ids `custom-<base36 time>` and reuse one of the 10 palettes.

## #2 Sleep / mood overlap *(open)*
Top-level `sleep` and `mood` exist on every entry and the «Сон»/«Настрій» domains also take a 1–5 score.
Options: (a) keep independent (current build); (b) the cards read `entry.sleep`/`entry.mood` and only store
`good` + `tags` under `domains.sleep`/`domains.mood`. Psychology agent to decide.

## #3 Sync file formats *(architecture, informational)*
- `entries/YYYY-MM.json` → `{ "YYYY-MM-DD": DayEntry }`, keys sorted.
- `reviews/YYYY.json` → `{ "YYYY-Www": WeeklyReview }`.
- `config.json` → `{ schemaVersion, domains[], updatedAt }`. A fresh install's default config is stamped
  `1970-01-01T00:00:00Z` so it never overwrites the repo's config.
- `WeeklyReview` shape (not yet used by UI): `{ schemaVersion, week, bestDomain?, neglectedDomain?, whatHelped?, intention?: { domain?, text }, createdAt, updatedAt }`.

## #4 Users (profiles) on one device *(device-level; entry schema unchanged)*
- Each user has their own IndexedDB database (`spheres` for the first user, `spheres-<id>` for others).
- Data repo layout: the first user keeps the repo root; every other user syncs under `users/<id>/`
  (same `entries/`, `config.json`, `reviews/` inside).
- `profiles.json` at the repo root: `{ profiles: [{ id, name, color, createdAt, updatedAt }] }`, merged by id, newer
  `updatedAt` wins. It lets a reinstall bring every user back.
- New users inherit the first user's repo + token (same device, same owner). Separate tokens/repos per user are
  possible by entering them in that user's Settings.
