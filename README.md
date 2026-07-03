# Full Moon Declination Demonstrator — Accessible HTML5

An accessible, self-contained HTML5 port of the Adobe Flash *Full Moon Declination
Demonstrator* (`fullMoonDec001`), built on the shared KL-UNL foundation.

## It must be served over HTTP — it will NOT run from a double-clicked file

Opening `index.html` directly (a `file://` path) shows a broken/empty title bar.

**Why:** the KL-UNL masthead component (`foundation/kl-unl-masthead.js`) loads its
title / Help / About text with `fetch('foundation/contents.json')`. Browsers block
`fetch()` of local files under the `file://` protocol (same-origin policy), so the
masthead cannot read its data and the page fails to initialise properly.

Served over HTTP the fetch succeeds and everything works.

## How to run locally

Run one of these **from inside this `html5/` folder**, then open the printed URL:

```
# Python (3.x)
python3 -m http.server 8123      # then open http://localhost:8123/

# Node
npx serve                        # or:  npx http-server

# VS Code
Use the "Live Server" extension and "Open with Live Server".
```

Because you are serving from inside `html5/`, the sim is at the server **root** —
the URL is `http://localhost:8123/`, not `.../html5/index.html`.

## Production

When deployed to the cloud host (served over HTTP/HTTPS) it just works. The
`file://` limitation only affects local double-clicking.

## Layout

```
html5/
  index.html            KL-UNL scaffold: .app-shell + <kl-unl-masthead> + two panels
  foundation/           KL-UNL foundation, copied in unchanged
                          (kl-unl-masthead.js, kl-unl.css, kl-unl.js — verbatim;
                           contents.json holds this sim's entry, see CONVERSION_NOTES.md)
  styles/styles.css     sim-specific styles only (never edits the foundation)
  simulation.js         all sim logic (engine port + plot + rendering + a11y)
  assets/               reused/vendored assets: sun-disc.svg, moon-disc.svg,
                          fonts/Verdana.ttf, and mathjax/ (local, SVG output; no CDN)
  README.md             this file
  CONVERSION_NOTES.md   behaviour model, AS→HTML5 mapping, deviations
  ACCESSIBILITY.md      WCAG affordances, keyboard map, color/contrast notes
```

Nothing is fetched from the network except the local `foundation/contents.json` and
the locally-vendored MathJax; no analytics, no CDN, no external fonts.
