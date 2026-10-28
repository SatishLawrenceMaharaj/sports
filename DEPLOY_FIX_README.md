# FIX YOUR LIVE SPORTS NEXUS VERCEL SITE

Your repository at https://github.com/SatishLawrenceMaharaj/sports was running the original standalone `server.js` and consequently Vercel used that file as the root serverless entrypoint. That led to an HTTP 500 page.

This ZIP is **repository-root ready**: unlike the prior ZIP, it contains `api/`, `lib/`, and `public/` directly at the ZIP root, along with `vercel.json` and `package.json`.

## Fix through the GitHub website

1. Extract this ZIP to an empty folder.
2. Open https://github.com/SatishLawrenceMaharaj/sports and make sure you're on branch `main`.
3. **Delete the existing `server.js` from the repository** (click it, find Delete file in the ellipsis menu, commit to `main`). This is important because Vercel's autodetection otherwise treats it as an app entrypoint.
4. Back in your GitHub repo, select **Add file > Upload files**. Drag in all the contents of the extracted folder, preserving the `api/`, `lib/`, and `public/` directory structure. If GitHub asks whether to replace existing files, confirm the updated files.
5. Commit the changes to `main`.
6. Vercel should automatically redeploy. Go to Vercel > sports > Deployments and open the latest Ready production deployment. If it does not start, choose Redeploy with Build Cache disabled.
7. Open https://sports-ten-jet.vercel.app/api/health and verify it returns JSON with `"ok": true`. Check https://sports-ten-jet.vercel.app/api/meta for the supported leagues, then open https://sports-ten-jet.vercel.app/ to view your dashboard.

## Confirm the GitHub root contains

```
api/fixtures.mjs
api/health.mjs
api/meta.mjs
lib/schedules.js
lib/watch.js
lib/catalog.js
public/index.html
public/app.js
public/styles.css
package.json
vercel.json
```

The old top-level `server.js` must be gone; the local development server is `local-server.cjs` and is not used by Vercel.

## Vercel Settings

- Root Directory: `./`
- Framework Preset: Other (`vercel.json` sets `framework: null`)
- Output Directory: public (`vercel.json` also specifies this)
- Build Command: no custom override
- Environment Variables: none
- Node version: 22.x (`package.json` pins it)

If you still get HTTP 500 after the **new deployment**, open Vercel > sports > Logs, filter to **Functions**, invoke `/api/health`, and inspect the exception. Build Logs showing `Ready` alone do not tell you why a request fails.

No database is required. Schedule APIs are third-party and can sometimes be unavailable. Only authorized broadcaster/watch links are provided.
