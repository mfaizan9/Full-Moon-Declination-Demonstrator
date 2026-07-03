# Conversion Notes — Full Moon Declination Demonstrator

## Behaviour model (one paragraph)

The demonstrator has two panels. **Declination Range Plot** (left) plots the
declination of the *full moon* over a year: a sinusoid that peaks near +23° around
the winter solstice and dips to −23° near the summer solstice (the full moon is
opposite the Sun, so its declination is the negative of the Sun's), wrapped in a
shaded band ≈±7° wide that represents the moon's wander above/below the ecliptic. A
draggable blue cursor selects the day of year. **Horizon Diagram** (right) is a 3-D
celestial sphere for a northern-hemisphere observer (latitude 41°) showing, for the
selected day, the Sun (gold disc) and the diametrically-opposite full Moon (grey
disc) on the sky, together with the ecliptic and celestial-equator circles, the
tilted north/south celestial-pole axis, a green horizon plane labelled N/E/S/W, and a
pink shaded band marking the moon's declination range. Dragging the day cursor moves
the Sun/Moon and re-derives the sidereal time; dragging the sphere rotates the view.

## Source → port mapping

| Flash source (AS1)                     | HTML5 port |
|----------------------------------------|------------|
| `frame_1/DoAction.as` `reset()`        | `reset()` — `setThetaAndPhi(200,20)`, `setDayOfYear(45)` (verbatim) |
| `frame_1` `doyCursor` drag             | plot pointer drag: `365*(x - plotLeft)/plotWidth` (verbatim mapping) |
| `Moon Dec Demo.as` `update()`          | `setDayOfYear()` — Sun/Moon RA·Dec, `siderealTime = sunRA+12` (verbatim constants) |
| `Moon Dec Plot.as` `init()`            | `renderPlot()` — curve `moonDec = -R2D·asin(0.397147…·sin((doy-78.5)/365·2π))`, band `dy = 7·yScale` (verbatim) |
| `CelestialSphere.as` + `2..9 CS *.as`  | `Sphere` / `Circle` / `Line` / `Disc` — projection matrices `doA/doM/doB`, `WtoSz/CtoSz/CtoW/WtoC`, `StoMH/MHtoC`, front/back arc split (verbatim) |
| `11 CS Shaded Bands.as` `update()`     | `ShadedBand.buildPaths()` — full `loc1/loc2` branch table, `drawSphericalArc`/`drawPerimeterArcs` tessellation, `doK` matrix (verbatim) |
| `5 CS Horizon Plane.as`                | `drawHorizonPlane()` — projects the alt=0 great circle to its ellipse and fills green (shape 43 gradient `#51c451→#3aa53a`) |
| `4 CS Mouse.as` `startSimpleDragging`  | sphere pointer drag: `θ -= dx/r`, `φ += dy/r` (verbatim) |
| `CSGradientDisk.as` (celestialBowl)    | `drawBowl()` — white(α0) centre → black(α20) edge, matching the instance's initObject |
| Sun Disc (shape 31), Moon Disc (29)    | `drawSun` / `drawMoon` — reused gradient/flat-fill colours |
| Symbol 204 (band fill), texts 33–36    | pink band gradient `#f18d8d→#6c1e1e`; N/E/S/W labels |

### Verbatim constants preserved
`0.39714789063478056` (sin obliquity), `0.9177546256839811` (cos obliquity),
day offsets `-78` (sphere) and `-78.5` (plot), `siderealTime = sunRA + 12`,
`minViewerAltitude = 7`, latitude `41`, sphere size `300` (r 150), band
`dec1=-5.1, dec2=5.1, tilt=23.4`, plot `width=400, height=275, maxDec=40`,
band half-width `7°`. Circle/line/band colours are the exact decimal-RGB ints
from the AS (e.g. ecliptic `10502208`, meridian/equator `16769909`, pole axis
`7711231`, band border `16711680`, plot curve `10502208`, plot band `13664384`).

## contents.json — which model applies

The linked export ships a **shared** `foundation/contents.json` (the full master
list). In this export that master file is **malformed** — it contains a raw newline
inside the `ce_hc` help string and a stray non-UTF-8 byte (`0x9d`), so `JSON.parse`
(and therefore the masthead) fails on it. Every already-converted sibling sim in this
collection instead ships its **own trimmed, valid** per-sim `contents.json` (e.g. the
Celestial Equatorial demo's copy contains only its own entry plus the `newSim`
template). We follow that established per-sim model: `html5/foundation/contents.json`
is a clean, valid file containing the **verbatim** `fullmoondec` entry that already
exists in the master (`meta.title`, `meta.version`, and the Help/About HTML) plus the
`newSim` template. No other foundation file is modified; `kl-unl-masthead.js`,
`kl-unl.css`, and `kl-unl.js` are copied byte-for-byte.

If your deployment uses a **single shared** contents.json instead, add this entry to
it (alphabetical by key) and do not ship the per-sim copy:

```json
"fullmoondec": {
  "meta": { "title": "Full Moon Declination Demonstrator", "version": "2.0" },
  "masthead": {
    "help":  { "title": "Help and Instructions",
      "content": "<p>This demonstrator shows the declination range of the full moon over the course of a year, and the corresponding changes in altitude for a northern hemisphere observer.</p>" },
    "about": { "title": "About this Demonstrator",
      "content": "<p>For additional astronomy education materials please visit <a href=\"https://astro.unl.edu/\">Astronomy Education</a> at the University of Nebraska-Lincoln.</p><p>This demonstrator has been modernized by the AAS Applet Task Force to meet modern web accessibility standards (WCAG 2.1 AA).</p><p>Permission is granted to use these files for noncommercial purposes as long as they remain unmodified.</p>"
  } }
}
```

## Deviations from the original

- **Help/About shown.** The original Flash `Title Bar` was configured with
  `aboutLinkageName = ""` and `helpLinkageName = ""`, so it displayed only a *reset*
  option. The modernized KL-UNL `fullmoondec` entry (already present in the shared
  contents.json) provides Help and About text, so the masthead shows those buttons.
  This is the foundation's intended behaviour and the Help/About text is used
  verbatim from that entry; the original texts folder's Help/About strings were stale
  placeholder text from an unrelated (Hydrogen Atom) sim and were **not** used.
- **Keyboard controls added (accessibility).** The original is mouse-only (drag the
  cursor / drag the sphere). We add a native **Day of year** slider + number field
  and full arrow-key control on both canvases. All paths mutate the same state, so
  behaviour is identical to dragging.
- **Rendering is on `<canvas>`.** The AS engine draws with nested MovieClips + masks;
  we reproduce the same geometry/occlusion on a 2-D canvas (front/back hemisphere
  split, band fill via the same tessellation). Colours are re-derived from the AS
  ints / exported shapes; the palette is not remapped, so the look matches the
  original screenshot within the KL-UNL shell.
- **Shaded-band fill** uses the pink "Symbol 204" gradient directly rather than the
  Flash mask-over-clip mechanism; the visible result is identical.
- **No autonomous animation** exists in this sim (all motion is user-driven), so no
  Pause control is required and `prefers-reduced-motion` needs no special handling.

## Cross-browser

Standards-only HTML/CSS/JS (Pointer Events, `<canvas>` 2-D, `Path2D`, CSS grid,
`aspect-ratio`), no vendor-prefix-only declarations, MathJax vendored locally with
SVG output. Verified rendering + interaction logic against Chromium; the same APIs
are supported in current Safari/WebKit and Firefox.
