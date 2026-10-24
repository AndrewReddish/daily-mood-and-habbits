# Сфери · Spheres

A phone-first web app for a daily reflection in under 90 seconds: overall mood, how each life domain went and what was good in it, then patterns across days and weeks. Ukrainian by default, English in Settings.

- **Plan & status:** [PLAN.md](PLAN.md) · **Architecture:** [ARCHITECTURE.md](ARCHITECTURE.md) · **Contract proposals:** [CHANGES.md](CHANGES.md)
- **Design source:** [`design/`](design) (Claude Design handoff; tokens and assets are used verbatim)

## Develop
```sh
npm install
npm run dev        # http://localhost:5173/daily-mood-and-habbits/
npm test           # Vitest unit tests
npm run build      # typecheck + production build into dist/
```

## Deploy (GitHub Pages)
1. Repo **Settings → Pages → Source: GitHub Actions** (the repo must be public for free Pages).
2. Push to `main`; `.github/workflows/deploy.yml` tests, builds and deploys.

## Set up sync (once, on the phone)
1. Create a **private** repo for the data, e.g. `spheres-data` (an empty README is fine).
2. Create a **fine-grained personal access token**: *Only select repositories → spheres-data*, permission **Contents: Read and write**.
3. In the app: **Налаштування → Токен GitHub**, enter `owner/spheres-data` and the token.
4. On iPhone, open the site in Chrome/Safari → Share → **Add to Home Screen**, and use it from the icon (iOS clears website storage after 7 idle days; Home Screen apps keep it).
