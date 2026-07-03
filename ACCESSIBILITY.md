# Accessibility Notes — Full Moon Declination Demonstrator

Target: WCAG 2.1 AA (AAA where reasonable). Human screen-reader QA on real
NVDA + VoiceOver is still recommended before release.

## Structure & semantics
- One `<h1>` — the sim title, rendered by the `<kl-unl-masthead>` component (the sim
  does not add a competing h1). Two `<h2>` panel headings ("Declination Range Plot",
  "Horizon Diagram") in a non-skipping order.
- Landmarks: masthead `<header>`/`<nav>` (from the component), `<main class="app-layout">`,
  two `<section class="panel">` regions labelled by their headings, and a visually
  hidden `aria-live` status paragraph.
- `<html lang="en">`.

## Text alternatives for the canvases (1.1.1)
Each `<canvas>` is `role="img"` with a short `aria-label` and an `aria-describedby`
paragraph that is **continuously updated from state**:
- Plot canvas → describes the curve, the ±7° band, and the cursor's day + the current
  full-moon declination (with units).
- Sphere canvas → describes the observer latitude, the green horizon plane (N/E/S/W),
  the Sun/Moon discs, the circles/axis/band, and the current view azimuth/altitude.
- Canvas axis tick labels (−40°…40°, month names) and the N/E/S/W compass letters are
  painted on the canvas (they are part of the diagram image). They are **not**
  individually MathJax-typeset; their information is fully conveyed by the text
  descriptions above and the live region. All *interactive* math (the declination
  readout, degree symbols) lives in HTML and is MathJax-typeset (see below).

## Mathematics via MathJax (rule 8 / 8a)
- The full-moon declination readout is typeset with MathJax (SVG output) through the
  foundation helper `klunlShowEquation(...)`, e.g. \(\delta_{\text{moon}} = +12.5^{\circ}\),
  paired with a spoken `.sr-only` description that includes the quantity, value, and
  unit. Right-clicking the readout opens the MathJax context menu
  ("Show Math As → TeX / MathML"); the menu is left enabled and not trapped.
- MathJax is vendored locally in `assets/mathjax/` (SVG output, `fontCache: 'local'`)
  — no CDN, no remote fonts.

## Colour & contrast (1.4.1 / 1.4.3 / 1.4.11)
- Palette comes from the KL-UNL CSS custom properties; body text is dark charcoal on
  white (well above 4.5:1). Focus rings use the foundation `--outline-color`.
- **No state is encoded by colour alone.** The Sun and Moon are also named in the
  descriptions ("gold disc is the Sun", "grey disc is the full Moon"); the horizon
  plane carries N/E/S/W letters; the declination value is always given numerically.
- Physically meaningful colours (gold Sun, pink declination band, green horizon) are
  kept for recognisability and are supplemented by text, never used as the sole cue.

## Keyboard (2.1.1 / 2.1.2 / 2.4.7)
- Everything is operable by keyboard with a visible `:focus-visible` ring; no traps.
  The masthead dialog manages its own focus/Escape.
- **Day of year** — native `<input type="range">` (Left/Down −1, Right/Up +1,
  PageUp/PageDown ±30, Home/End = 1/365), plus a number field. `aria-valuetext`
  announces the full spoken value with units, e.g. *"Day 200 of 365, July. Full moon
  declination minus 20.2 degrees."*
- **Plot canvas** — focusable (`tabindex="0"`); arrow keys move the day (Shift = ±10,
  Home/End = ends of year). Committing announces the day + declination.
- **Sphere canvas** — focusable; arrow keys rotate the view (Shift = 15° steps).
  Announces the new azimuth/altitude with units.
- Tab moves away from every control normally (no sticky focus).

## Screen-reader narration (NVDA + VoiceOver)
- A single `aria-live="polite"` status region announces meaningful changes **on
  commit** (slider `change`, drag release, key commit, reset) — not on every drag
  tick — to avoid flooding.
- **Units are always spoken with numbers.** Values are rendered with their quantity
  name and unit spelled as words ("degrees", "day … of 365", month name), and a
  leading minus is spoken as the word "minus" (screen readers routinely drop a "−"
  glyph). No bare numbers are announced.
- The canvas `aria-describedby` descriptions give an audio-only user the same
  "what's happening" a sighted user sees, updated from the single render/state path.

## Motion (2.2.2 / 2.3.3)
- There is no autonomous/continuous animation — all motion is user-driven — so nothing
  flashes and no Pause control is needed. `prefers-reduced-motion` therefore requires
  no special handling. (Reset is provided by the masthead's `sim-reset` event.)

## Responsive / zoom (1.4.4 / 1.4.10)
- Sizing is in rem/em; body text ≥ 1.125rem. Layout reflows from the two-column
  desktop/iPad arrangement to a single stacked column below the foundation's 56rem
  breakpoint and down to phone-portrait width with no horizontal scrolling, and
  remains usable at 200% zoom. Canvases keep their internal coordinate systems and are
  scaled by CSS with preserved aspect ratio.
- Touch: Pointer Events drive both drag paths; `touch-action: none` on the canvases so
  dragging does not scroll the page. No hover-only affordances. Targets ≥ 44px.
