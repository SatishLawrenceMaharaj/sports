# SPORTS NEXUS

**A free, fully functional Node.js sports-fixture dashboard.** Browse upcoming NBA, NFL, UFC, Formula 1, Premier League, La Liga, Ligue 1, Serie A, Bundesliga, Champions League, and more, from one place. Follow teams, star events, open official viewing links and add 30-minute calendar reminders.

![No paid service needed](https://img.shields.io/badge/Cost-Free-98D658) ![Node 20+](https://img.shields.io/badge/Node.js-20%2B-brightgreen) ![Database](https://img.shields.io/badge/Database-None-blue)

## Quick start (Windows)

1. Extract the ZIP.
2. Install **Node.js 20 or later** from https://nodejs.org/ (if it isn't installed).
3. Double-click **`run-windows.bat`**.
4. Your browser opens at **http://localhost:3400**. If it does not, visit that URL manually.
5. Keep the command window open while using the app. Close it to stop the server.

**No npm install. No API key. No database. No login or subscription for the app itself.**

On Mac or Linux:

```bash
cd sports-nexus
./run-mac-linux.sh
# or simply: node local-server.cjs
```

Run automated tests:

```bash
npm test
```

If port 3400 is busy, set `PORT=4500` (PowerShell: `$env:PORT=4500; node local-server.cjs`).

## Features

- **Game on dashboard:** live count, next 24 hours, week ahead, spotlight countdown and the next event for each of the five sports.
- **Match center:** group-by-day fixtures, scores/status where published, search, competition filters, sport navigation, and 7/14/30/60-day ranges.
- **Soccer competitions:** Premier League, La Liga, Ligue 1, Serie A, Bundesliga, Champions League; optionally Europa League, MLS, Eredivisie, Primeira Liga and EFL Championship.
- **UFC:** event calendar, scheduled event start (not guaranteed main-card/fight times) and official fight-viewing pages.
- **F1:** official-ish race schedule through community Jolpica data, including scheduled qualifying and race times; backup ESPN calendar gives **weekend start only** if race times are unavailable.
- **Streaming discovery:** event-level **Where to watch** actions linking to licensed platforms and broadcaster/competition guides. ESPN Caribbean is prioritized for Premier League (as listed by the league). Links are not embedded player URLs and do not guarantee rights to any individual fixture.
- **Personalization:** enable leagues, follow teams, save events, hide scores, choose Trinidad and Tobago (AST) or other timezone.
- **Reminders:** download an `.ics` calendar entry for any event, containing a 30-minute reminder. Open the downloaded file in a calendar application to use the reminder.
- **Mobile-ready:** responsive UI and small-screen navigation. No cloud connection or external CSS/JS libraries required for the interface.
- **Privacy:** all preferences live in browser `localStorage` on your own device. The server does not collect or store user identity, teams, or viewing history.

## What is free, and what is not?

The **application and schedule data access are free**, with no required paid service. Streaming live professional sports is **often not free**, and this app does not bypass subscriptions, PPV fees, geographical restrictions, or DRM. It links only to legitimate broadcasters and competition services; you need the appropriate right-to-view for each event. Some official services offer free highlights or occasional free content.

## How it works

```
Browser (HTML/CSS/JavaScript)
    |-- localStorage for your settings
    |-- /api/meta      -> competition catalog + official viewing links
    +-- /api/fixtures  -> local Node.js server
                           |-- ESPN public endpoints (keyless, unofficial):
                           |     NBA, NFL, soccer, UFC calendar
                           +-- Jolpica F1 (free non-commercial API):
                                 F1 race & qualifying schedule
```

Server built with **Node.js built-in `http`, `fs`, and `fetch`**. Nothing to install via npm. Requests are limited to supported competitions, cached in memory to reduce source load, made with bounded concurrency, and time out after 10.5 seconds. Partial provider failure is shown rather than inventing matches. Cached data may be served stale on provider failures, clearly indicated.

- **ESPN**: undocumented and unofficial `site.api.espn.com` endpoints (no availability promise). Details: https://github.com/pseudo-r/Public-ESPN-API
- **Jolpica F1**: https://api.jolpi.ca/docs/ ; **non-commercial usage only** and subject to CC BY-NC-SA 4.0 and fair-use limits. See https://github.com/jolpica/jolpica-f1/blob/main/TERMS.md
- Official Premier League regional broadcast directory: https://www.premierleague.com/en/media/broadcasters

**Important:** For public/commercial deployment, obtain permission or use licensed schedule data providers. The unauthenticated ESPN API is not an official production SLA and can change. This is intended for personal use; it is not an ESPN-, UFC-, NFL-, NBA- or F1-affiliated product.

## Troubleshooting

| Problem | Action |
|---|---|
| No matches | Confirm you are connected to the internet. Try a longer range, verify league selection, and click ↻. |
| Partial data banner | An upstream provider may have timed out or changed its API. Others continue working. |
| F1 says 'race weekend begins' | Jolpica unavailable; ESPN calendar fallback cannot provide a reliable race start time. |
| Football competition empty | May be out of season/international break, or ESPN's data may be incomplete. |
| Times wrong | Preferences → choose **Trinidad & Tobago (AST)** or **My device timezone**. |
| Watch link doesn't show a particular game | Regional rights differ. Use the official broadcaster guide; the app doesn't claim to verify each stream. |
| Window immediately closes | Install Node 20+; open a terminal in the extracted folder and run `node local-server.cjs`. |
| Settings gone on another browser | Preferences are device/browser-local, not a shared DB. |

## Use on your phone on the same Wi-Fi

The default server listens on **127.0.0.1 only** for privacy. To open it from another device on your LAN:

```powershell
$env:HOST="0.0.0.0"
node local-server.cjs
```

Find your computer's private network IP (`ipconfig`) and browse to `http://YOUR-PC-IP:3400` on the phone. You may need to allow inbound TCP 3400 in your local firewall. **Do not port-forward this app to the public internet** without adding authentication, TLS and appropriate hardening. Preferences saved on your phone are independent of those saved on the PC.

## Customization

- `lib/catalog.js` defines available leagues and their ESPN sport/league codes.
- `lib/watch.js` holds legitimate viewing service links and caveats.
- `lib/schedules.js` adapts API responses into one event format and implements caching/fallback.
- `public/styles.css` controls theme and layout.
- `public/app.js` implements filters, local storage, time-zone formatting, favourites, calendar downloads and live-refresh.

## License

MIT license for the original application source code. Trademarks and sourced sports data remain the property of their respective owners; source data may have separate restrictions. Do not remove source attribution when reusing data.

## Deploy to Vercel (free Hobby plan)

This ZIP includes Vercel-native API functions (`api/meta.mjs`, `api/health.mjs`, `api/fixtures.mjs`) and a `vercel.json`. The static site is served from `public/`. Vercel does **not** need a constantly-running Node server, database or API key. `local-server.cjs` remains available for offline/local development.

### GitHub + Vercel (easiest to update)

1. Extract this ZIP and create a **new GitHub repository** (e.g. `sports-nexus`). Upload **the files and folders inside** `sports-nexus-vercel` to the repository **root**. Include the `public`, `api`, and `lib` directories, `package.json`, and `vercel.json`. Do **not** upload the outer folder as one nested directory unless you configure Vercel's Root Directory to point to it.
2. Sign in to https://vercel.com/new and import your repository.
3. Use **Framework Preset: Other**, **Root Directory: `./`**, **Output Directory: `public`** (typically detected automatically), and leave Build Command and Environment Variables empty. If the Output Directory is prefilled with a different value, override to `public`.
4. Click **Deploy**, then open your generated `https://<project>.vercel.app` domain.
5. Verify `https://<project>.vercel.app/api/health` returns JSON containing `"ok":true` and `/api/meta` returns a list of leagues. The `/api/fixtures?leagues=nba&days=7` route is a live upstream test.
6. For later changes, push new commits to GitHub and Vercel will rebuild automatically.

### Deploy without GitHub (Vercel CLI)

From the extracted project directory, open PowerShell/Terminal:

```powershell
npm install -g vercel
vercel login
vercel --prod
```

For the first deployment, select your personal account, confirm this is a new project, accept `./` as the project root, and choose the default project settings. If prompted for an Output Directory, use `public`. Subsequent runs of `vercel --prod` redeploy your latest local files.

### Important notes

- **Hobby** is suitable for personal, non-commercial projects within Vercel's limits; check https://vercel.com/pricing for current plan conditions.
- A serverless function does not guarantee persistent process memory. Temporary provider caching can disappear after a cold start. Your favourites and settings continue to live in browser localStorage and are not synchronized across devices.
- Sports schedule API data comes from **third parties** and can be unavailable or rate-limited. `api/fixtures.mjs` is configured for a 60-second function timeout because it may query several providers.
- Viewing links are for official broadcasters/rights holders; watching live events may require a subscription and varies by territory.
- No environment variables or secrets are required. The ESPN endpoint is unofficial and Jolpica's data carries non-commercial usage terms.
