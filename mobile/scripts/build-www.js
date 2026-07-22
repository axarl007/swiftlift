#!/usr/bin/env node
'use strict';
/*
 * Generates mobile/www/ from the repo-root PWA source, so the Android
 * package can never drift out of sync with the PWA. Run via `npm run
 * build:www` (also invoked by CI before `cap sync`). www/ itself is
 * gitignored — it's build output, not source.
 *
 * Swiftlift.html needs one deliberate change versus the root copy: the
 * CDN-hosted React/Babel/Tailwind/Fonts are swapped for local vendor/
 * copies, so the packaged app works fully offline from first launch (the
 * root PWA's service worker only caches those CDN resources after a
 * successful first fetch, which doesn't help a fresh APK install that's
 * never been online). That swap is done by exact string match below and
 * fails loudly if root's markup no longer matches, rather than silently
 * shipping an APK that still depends on the network.
 */
const fs = require('fs');
const path = require('path');

const MOBILE = path.resolve(__dirname, '..');
const ROOT = path.resolve(MOBILE, '..');
const WWW = path.join(MOBILE, 'www');
const VENDOR = path.join(WWW, 'vendor');
const NODE_MODULES = path.join(MOBILE, 'node_modules');

fs.rmSync(WWW, { recursive: true, force: true });
fs.mkdirSync(path.join(VENDOR, 'fonts'), { recursive: true });

const PLAIN_COPY_FILES = [
  'index.html', 'manifest.json', 'sw.js', 'icon.svg', 'icon-maskable.svg',
  'store.js', 'utils.js', 'data.js', 'suggestion-engine.js', 'csv-parser.js', 'json-backup.js',
  'meal-planner.jsx', 'circuit.jsx', 'tabs.jsx', 'log.jsx', 'app.jsx',
];

for (const f of PLAIN_COPY_FILES) {
  fs.copyFileSync(path.join(ROOT, f), path.join(WWW, f));
}

let html = fs.readFileSync(path.join(ROOT, 'Swiftlift.html'), 'utf8');

function swap(html, from, to, label) {
  if (!html.includes(from)) {
    throw new Error(
      `build-www: expected "${label}" block not found in root Swiftlift.html.\n` +
      'Root markup changed since this script was written — update the matching ' +
      'block in mobile/scripts/build-www.js to match, then re-run.'
    );
  }
  return html.split(from).join(to);
}

const FONTS_TAILWIND_BLOCK = `<!-- Fonts -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

<!-- Tailwind -->
<script src="https://cdn.tailwindcss.com"></script>
<script>
  tailwind.config = {
    theme: {
      extend: {
        fontFamily: { sans: ['Manrope', 'ui-sans-serif', 'system-ui'] },
      }
    }
  }
</script>`;

const FONTS_TAILWIND_REPLACEMENT = `<!-- Fonts (self-hosted for offline use) -->
<link href="vendor/manrope.css" rel="stylesheet" />

<!-- Tailwind (precompiled offline build, replaces cdn.tailwindcss.com) -->
<link href="vendor/tailwind.css" rel="stylesheet" />`;

const REACT_BABEL_BLOCK = `<!-- React + Babel -->
<script src="https://unpkg.com/react@18.3.1/umd/react.development.js" integrity="sha384-hD6/rw4ppMLGNu3tX5cjIb+uRZ7UkRJ6BPkLpg4hAu/6onKUg4lLsHAs9EBPT82L" crossorigin="anonymous"></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js" integrity="sha384-u6aeetuaXnQ38mYT8rp6sbXaQe3NL9t+IBXmnYxwkUI2Hw4bsp2Wvmx4yRQF1uAm" crossorigin="anonymous"></script>
<script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js" integrity="sha384-m08KidiNqLdpJqLq95G/LEi8Qvjl/xUYll3QILypMoQ65QorJ9Lvtp2RXYGBFj1y" crossorigin="anonymous"></script>`;

const REACT_BABEL_REPLACEMENT = `<!-- React + Babel (self-hosted for offline use, production builds) -->
<script src="vendor/react.production.min.js"></script>
<script src="vendor/react-dom.production.min.js"></script>
<script src="vendor/babel.min.js"></script>`;

html = swap(html, FONTS_TAILWIND_BLOCK, FONTS_TAILWIND_REPLACEMENT, 'Fonts/Tailwind CDN');
html = swap(html, REACT_BABEL_BLOCK, REACT_BABEL_REPLACEMENT, 'React/Babel CDN');

fs.writeFileSync(path.join(WWW, 'Swiftlift.html'), html);

fs.copyFileSync(path.join(NODE_MODULES, 'react/umd/react.production.min.js'), path.join(VENDOR, 'react.production.min.js'));
fs.copyFileSync(path.join(NODE_MODULES, 'react-dom/umd/react-dom.production.min.js'), path.join(VENDOR, 'react-dom.production.min.js'));
fs.copyFileSync(path.join(NODE_MODULES, '@babel/standalone/babel.min.js'), path.join(VENDOR, 'babel.min.js'));

const WEIGHTS = ['400', '500', '600', '700', '800'];
for (const w of WEIGHTS) {
  fs.copyFileSync(
    path.join(NODE_MODULES, `@fontsource/manrope/files/manrope-latin-${w}-normal.woff2`),
    path.join(VENDOR, 'fonts', `manrope-${w}.woff2`)
  );
}
const manropeCss = WEIGHTS.map((w) => `@font-face {
  font-family: 'Manrope';
  font-style: normal;
  font-weight: ${w};
  font-display: swap;
  src: url('./fonts/manrope-${w}.woff2') format('woff2');
}`).join('\n\n') + '\n';
fs.writeFileSync(path.join(VENDOR, 'manrope.css'), manropeCss);

console.log(`build-www: generated mobile/www/ from repo root (${PLAIN_COPY_FILES.length + 1} app files + vendor libs)`);
