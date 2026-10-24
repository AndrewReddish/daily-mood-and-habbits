# Deploying Сфери · Spheres

The app is a static PWA hosted on **GitHub Pages**. GitHub Actions builds and deploys it.
Your diary entries are stored separately, in a **private** GitHub repo that only your phone talks to.

**App link once deployed:** https://andrewreddish.github.io/daily-mood-and-habbits/

---

## Part 1 — Publish the app (≈ 5 minutes, once)

### 1. Make `main` the default branch
The repo was empty, so the first pushed branch (`claude/epic-mayer-t8vtr9`) became the default.

1. Open **https://github.com/AndrewReddish/daily-mood-and-habbits/settings**.
2. Under **Default branch**, click the ⇄ (switch) icon, choose **`main`**, then **Update** and confirm.

### 2. Turn on GitHub Pages via Actions
1. Open **Settings → Pages** (https://github.com/AndrewReddish/daily-mood-and-habbits/settings/pages).
2. Under **Build and deployment → Source**, choose **GitHub Actions**. Nothing else needs to be filled in.
   - Pages is free only for **public** repos, and this repo is public. That's fine: it contains only code. Your entries live in the private data repo (Part 2).

### 3. Merge the pull request
1. Open the PR and wait for the **CI & deploy / build** check to turn green (tests + build).
2. Click **Merge pull request**.
3. The merge is a push to `main`, which runs the workflow again. This time it also runs the **deploy** job.

### 4. Check the deployment
1. Open the **Actions** tab, then the latest **CI & deploy** run. Both `build` and `deploy` should be green (≈ 1–2 min).
2. The `deploy` job shows the link. It is also under **Settings → Pages** ("Your site is live at …").
3. Open **https://andrewreddish.github.io/daily-mood-and-habbits/**. You should see «Добрий вечір» (or the greeting for your time of day) with the mood picker.

> **Deploying without merging (optional):** after steps 1–2 you can also run **Actions → CI & deploy → Run workflow** and pick any branch.
> If GitHub refuses with *"Branch … is not allowed to deploy to github-pages due to environment protection rules"*,
> go to **Settings → Environments → github-pages → Deployment branches** and add that branch, or just merge to `main`.

---

## Part 2 — Sync to a private data repo (≈ 5 minutes, once)

You can skip this to try the app: without it everything is stored on the phone only.
Before you rely on the app daily, set it up: it's your backup, and it restores entries after a reinstall.

### 1. Create the private data repo
1. Go to **https://github.com/new**.
2. Name: **`spheres-data`**. Visibility: **Private**. Tick **Add a README file** (the repo must not be completely empty).
3. **Create repository**.

### 2. Create a fine-grained token for that repo only
1. Go to **https://github.com/settings/personal-access-tokens/new**.
2. **Token name:** `Spheres phone`. **Expiration:** your choice (e.g. 1 year; set a reminder to renew it).
3. **Repository access → Only select repositories →** `AndrewReddish/spheres-data`.
4. **Permissions → Repository permissions → Contents → Read and write.** Leave everything else at *No access*. (*Metadata: Read* is added automatically.)
5. **Generate token** and copy it (starts with `github_pat_…`). GitHub shows it only once.

### 3. Connect the app
1. In the app: **Налаштування → Токен GitHub**.
2. **Приватний репозиторій для даних:** `AndrewReddish/spheres-data`.
3. **Токен GitHub:** paste the token, then tap **Підключити**.
4. The row should read **✓ Синхронізовано о HH:MM**. Log a day, wait ~3 seconds, and open `spheres-data` on GitHub: you'll see `entries/YYYY-MM.json` and `config.json`.

The token is stored only on that device (IndexedDB) and sent only to `api.github.com`. Each new device needs the token entered once.

---

## Part 3 — Install on the iPhone

Use the app from the Home Screen icon, not from a browser tab. iOS deletes a website's storage after 7 days without a visit, but Home Screen apps keep theirs.

1. Open **https://andrewreddish.github.io/daily-mood-and-habbits/** in **Safari** or **Chrome**.
2. Safari: tap **Share** (□↑), then **Add to Home Screen**, then **Add**.
   Chrome (iOS 16.4+): tap **⋯** or **Share**, then **Add to Home Screen**.
3. Open **Сфери** from the Home Screen icon. It runs full-screen, with no browser bars.
4. Connect sync (Part 2, step 3) **inside the installed app**: the installed app and the browser tab keep separate storage.

---

## Quick checklist to try it out

- [ ] Tap a mood face, then **Зберегти день**: the "day saved" flower appears.
- [ ] Tap a domain card: rate it, write "що було добре", add a tag, then **Готово**. The card shows the flower and the text.
- [ ] **Внутрішній стан, енергія, мить дня** opens steps 3 → 5. Fill some, skip others.
- [ ] **Історія** shows today tinted by mood. Tap a past day, then tap the card to edit it.
- [ ] **Налаштування**: switch to **English** (no reload), then **Темна**, then back.
- [ ] Airplane mode: change something. Back online: a few seconds later the change is in `spheres-data`.
- [ ] **Експорт у CSV** and **Резервна копія JSON** open the iOS share sheet.

---

## Updating the app later
Every merge to `main` redeploys automatically. An installed app picks up the new version the next time it's opened (sometimes it takes a second open).

## Troubleshooting

| Symptom | Fix |
|---|---|
| Link shows **404** | Pages source not set to *GitHub Actions* (Part 1.2), or the deploy job hasn't run or failed. Check the Actions tab. |
| Page loads but is blank or unstyled | Hard-refresh. If it persists, check the workflow built with `BASE_PATH=/daily-mood-and-habbits/` (the default in the workflow). |
| Deploy job: *not allowed to deploy to github-pages* | Settings → Environments → github-pages → allow the branch, or deploy from `main`. |
| Sync row says **401** | Token wrong or expired. Create a new one (Part 2.2) and paste it again. |
| Sync row says **403** / **404** | Token doesn't include `spheres-data`, Contents isn't *Read and write*, or the repo name is mistyped (`owner/name`). |
| No install hint on iPhone | It shows once, and only in a browser tab. Use Share → Add to Home Screen manually. |
| Old version after an update | Close the app fully (swipe up) and reopen it. |

## Running locally
```sh
npm install
npm run dev       # http://localhost:5173/daily-mood-and-habbits/
npm test
npm run build && npm run preview
```
