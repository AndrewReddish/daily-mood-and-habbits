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

## Deploy & sync setup
Step-by-step guide: **[DEPLOY.md](DEPLOY.md)** (GitHub Pages, private data repo + token, iPhone install, troubleshooting).

App link once deployed: https://andrewreddish.github.io/daily-mood-and-habbits/
