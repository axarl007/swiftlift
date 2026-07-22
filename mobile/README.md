Swiftlift is a native Android package
=======================================

This folder packages the Swiftlift PWA as an offline-capable Android APK. It
is fully self-contained and does **not** modify the root PWA in any way —
`index.html`, `Swiftlift.html`, `manifest.json`, `sw.js`, and the app source
files at the repo root are untouched and still deploy to GitHub Pages exactly
as before.

## What's in here

- `www/` — **generated, not committed** (gitignored). Built fresh from the
  root PWA source by `npm run build:www` (`scripts/build-www.js` + a Tailwind
  CLI build), so it can never silently drift out of sync with the PWA. The
  only deliberate change versus the root files is in `Swiftlift.html`, where
  the CDN-hosted React, ReactDOM, Babel, Tailwind, and Google Fonts
  `<script>`/`<link>` tags are swapped for locally vendored files under
  `www/vendor/`. This is required for the packaged app to work with **zero
  network access**, including on first launch — the root PWA's service
  worker only caches those CDN resources after a successful first fetch,
  which doesn't help a fresh APK install that's never been online. The swap
  is done by exact string match and fails loudly (breaking the build) if
  root's markup no longer matches, rather than silently shipping an APK
  that still depends on the network.
- `scripts/build-www.js` / `tailwind.config.js` / `src/tailwind-input.css` —
  the generator: copies root files verbatim into `www/`, rewrites
  `Swiftlift.html`'s CDN block, and copies vendor libraries (React, ReactDOM,
  Babel standalone, Manrope) from `mobile/node_modules`. The Tailwind CSS
  build itself (scanning `www/**/*.{html,js,jsx}` for classes actually used)
  runs as the second half of `npm run build:www`.
- `capacitor.config.json` / `package.json` — Capacitor (Ionic's official
  native wrapper) configuration and the vendor/build tooling
  (`react`, `react-dom`, `@babel/standalone`, `@fontsource/manrope`,
  `tailwindcss`, all pinned devDependencies). Independent of the root
  `package.json` — doesn't affect the web PWA's dependencies.
- `android/` — generated on demand by Capacitor (`npx cap add android`) and
  intentionally **not committed** (see root `.gitignore`) to keep the repo
  and the GitHub Pages deploy small. CI regenerates it fresh on every build.

## Building the APK

Handled by `.github/workflows/build-apk.yml`, either automatically on
changes under `mobile/**` or manually via the Actions tab
("Build Android APK (mobile/)" → Run workflow). The workflow runs
`npm run build:www` before `cap add android`, so it always packages the
current root PWA source. The signed-debug APK is uploaded as a downloadable
build artifact (`swiftlift-debug-apk`).

The output is a **debug-signed** APK, meant for sideloading directly onto a
device ("install from unknown sources"). It is not intended for Play Store
submission, which requires a release signing key.

## Updating after a PWA change

Nothing to do here — CI always regenerates `www/` from the current root
source before building. Just push your PWA change, then trigger the APK
build (push something under `mobile/**`, e.g. this README, or run the
workflow manually from the Actions tab). To build locally: `cd mobile &&
npm run build:www`.

The one thing that needs a manual update, and only if it happens: if the
CDN `<script>`/`<link>` markup in root `Swiftlift.html` changes (e.g.
bumping the pinned React/Tailwind CDN version), `build-www.js`'s exact-match
swap will throw and fail the build rather than silently shipping a
network-dependent APK. Update the matching block in
`scripts/build-www.js` to the new markup and re-run.

## Reverting this packaging entirely

Everything mobile-specific lives under this folder plus the one workflow
file. To remove Android packaging completely with no effect on the PWA:

```
git rm -r mobile .github/workflows/build-apk.yml
git commit -m "Remove Android packaging"
```
