Swiftlift is a native Android package
=======================================

This folder packages the Swiftlift PWA as an offline-capable Android APK. It
is fully self-contained and does **not** modify the root PWA in any way —
`index.html`, `Swiftlift.html`, `manifest.json`, `sw.js`, and the app source
files at the repo root are untouched and still deploy to GitHub Pages exactly
as before.

## What's in here

- `www/` — a snapshot copy of the PWA's static files. The only edits versus
  the root copies are in `Swiftlift.html`, where the CDN-hosted React,
  ReactDOM, Babel, Tailwind, and Google Fonts `<script>`/`<link>` tags are
  swapped for locally vendored files under `www/vendor/`. This is required
  for the packaged app to work with **zero network access**, including on
  first launch — the root PWA's service worker only caches those CDN
  resources after a successful first fetch, which doesn't help a fresh APK
  install that's never been online.
- `www/vendor/` — self-hosted React 18.3.1, ReactDOM 18.3.1, Babel standalone
  7.29.0 (production builds), a precompiled static Tailwind CSS build (scanned
  against `www/**/*.{html,js,jsx}` to match the classes actually used), and
  self-hosted Manrope font files.
- `capacitor.config.json` / `package.json` — Capacitor (Ionic's official
  native wrapper) configuration. Independent of the root `package.json`.
- `android/` — generated on demand by Capacitor (`npx cap add android`) and
  intentionally **not committed** (see root `.gitignore`) to keep the repo
  and the GitHub Pages deploy small. CI regenerates it fresh on every build.

## Building the APK

Handled by `.github/workflows/build-apk.yml`, either automatically on
changes under `mobile/**` or manually via the Actions tab
("Build Android APK (mobile/)" → Run workflow). The signed-debug APK is
uploaded as a downloadable build artifact (`swiftlift-debug-apk`).

The output is a **debug-signed** APK, meant for sideloading directly onto a
device ("install from unknown sources"). It is not intended for Play Store
submission, which requires a release signing key.

## Updating after a PWA change

If you change the app's source files at the repo root, re-copy the relevant
file(s) into `mobile/www/` (keeping the vendor swap in `Swiftlift.html`), and
if the Tailwind class usage changed, regenerate `www/vendor/tailwind.css`
from a Tailwind v3 build scanning `mobile/www/**/*.{html,js,jsx}`.

## Reverting this packaging entirely

Everything mobile-specific lives under this folder plus the one workflow
file. To remove Android packaging completely with no effect on the PWA:

```
git rm -r mobile .github/workflows/build-apk.yml
git commit -m "Remove Android packaging"
```
