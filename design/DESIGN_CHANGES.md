# CHANGES — proposals from the design-system agent

## 1. Default domain list → 10 domains  *(status: chosen by Andrew in the design brief form, awaiting contract sign-off)*

Replaces the 8 defaults in the shared brief. Only `config.json` defaults change; the entry schema is untouched
(`domains` is still keyed by domain id).

| order | id | UA | EN | colour | replaces |
|---|---|---|---|---|---|
| 1 | sleep | Сон | Sleep | indigo | — (new) |
| 2 | body | Тіло | Body | sage | body |
| 3 | mood | Настрій | Mood | plum | mind |
| 4 | relationships | Стосунки | Relationships | rose | partner (+ family, people) |
| 5 | work | Робота | Work | slate blue | work |
| 6 | growth | Навчання | Growth | teal | growth |
| 7 | leisure | Дозвілля | Leisure | amber | joy |
| 8 | money | Гроші | Money | olive gold | — (new) |
| 9 | home | Дім | Home | terracotta | family (home life) |
| 10 | nature | Природа | Nature | moss | joy (nature, walks) |

### Open questions for the psychology + architecture agents
- **Overlap with top-level fields.** `sleep` (1–5) and `mood` (1–5) already exist on every entry. Proposal: the
  «Сон» and «Настрій» domain cards *read* `entry.sleep` / `entry.mood` as their score and only store `good` + `tags`
  under `domains.sleep` / `domains.mood`. Avoids asking the same question twice inside 90 seconds.
- **Prompts** for sleep, money, home, nature are design drafts in `src/i18n/strings.js` — psychology agent owns final wording.
- **Social / family** no longer have their own card; suggest default tags «рідні», «друзі» under relationships.

## 2. Illustration count
Brief asked for 12 (8 domains + 4 states). With 10 domains the set is **14**: 10 domain + empty-history, first-launch,
day-saved, offline.
