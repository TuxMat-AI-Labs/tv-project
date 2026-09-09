# Catching a display that renders wrong

**For the TuxDisplay project.** Self-contained: the problem, what was measured on
the hardware, what that rules in and out, and how to build the check into every
display.

---

## The short version

Some Samsung panels show the wall content **zoomed**. It drifts back on its own
after being reset, and the sets will not factory-reset (the option is greyed out).

A throwaway diagnostic page was put on a TV and photographed at two zoom levels.
It settled the question that had been guessed at twice: **the browser's zoom
resizes the CSS viewport.** That is detectable from JavaScript, so every display
can now check itself and report the fault instead of waiting for someone to walk
past and notice.

The check is worth having beyond zoom. The hub only ever measured whether a TV was
*checking in*. A display can be online, paired, on the right content — and still
wrong on the wall.

---

## The measurement

Static page opened in the TV browser, photographed at the TV's own zoom and again
at 100%. Same panel, minutes apart:

|                         | zoom 125%   | zoom 100%   |
| ----------------------- | ----------- | ----------- |
| `window.innerWidth`     | **864**     | **1080**    |
| `window.innerHeight`    | 1350        | 1688        |
| `visualViewport.scale`  | 1           | 1           |
| `devicePixelRatio`      | **1.25**    | **1**       |
| `screen.width x height` | 1080 x 1920 | 1080 x 1920 |
| `outerWidth x Height`   | 1080 x 1920 | 1080 x 1920 |

Read it as: `innerWidth` moves by exactly x1.25, `devicePixelRatio` moves with it,
`visualViewport.scale` does not move at all, and `screen` / `outerWidth` are fixed.

### What that rules in and out

There were three candidate behaviours, and they have very different consequences:

| | Signature | Fixable in the page? |
| --- | --- | --- |
| **A. CSS viewport resize** | `innerWidth` shrinks, `scale` stays 1 | **Yes** |
| B. Output magnification | `innerWidth` unchanged, `scale` ~1.25 | Yes, by pre-compensating |
| C. Below the web layer | nothing observable | No |

The numbers are **unambiguously A**.

This matters because the repo previously recorded the opposite. A note on
`PlaylistPlayer` reasoned from a correctly-sized image *appearing* to zoom that the
TV "magnifies the rendered output rather than resizing the CSS viewport — which no
page-side change can defeat." That inference was wrong, and it had already cost
two shipped-and-reverted fixes, one of which crashed a display.

**The lesson worth carrying over: two fixes were shipped on an unmeasured premise.
The page that settled it took an afternoon and a phone camera.**

### A useful corollary

Under case A, a layout sized entirely in viewport units (`vh`, `%`) is
**mathematically immune** to this zoom. At 125% the viewport is 864x1536, every
`vh` length is 0.8x, and it renders at `devicePixelRatio` 1.25 — identical device
pixels. Anything sized in `px` or `rem` does *not* scale and comes out 25% larger
while everything around it holds still.

So on a zoomed screen, a viewport-sized board looks correct and only the fixed-size
bits look wrong. If a whole screen looks zoomed, suspect something else — most
likely the browser has left kiosk mode (see below).

---

## What to build into each display

### Where the code goes

**The top-level window, not the content iframe.** A page inside an iframe measures
the *iframe's* viewport, not the panel's, so an embedded dashboard cannot see this
about itself. The player that owns the window is the only place that can.

### The two rules

```
zoom    = screen.width / window.innerWidth          // 1.0 when correct
missing = screen.height - (innerHeight x zoom)      // browser chrome, in device px
```

Flag `zoom` outside ~2% of 1.0, and `missing` above ~32px.

Width for the zoom and height for the chrome, deliberately: a toolbar eats
**height**, so mixing them conflates two faults that need different fixes. On these
panels a visible toolbar is ~232px of 1920 — 12% of the screen.

`screen.width` is the reference because it does **not** move with zoom here. That
is the whole basis of the ratio.

### Reporting it

Piggy-back the existing heartbeat rather than adding a channel — send
`innerWidth/innerHeight/screen.width/screen.height/devicePixelRatio` with it.

**One trap that will otherwise make this useless:** if your heartbeat fires only on
*content change*, a wall board is a single item that never advances, so it fires
once at mount and never again. That measures the viewport exactly once, at load —
and the entire point is that these screens drift **hours later**. Make the
heartbeat periodic.

The heartbeat endpoint is necessarily unauthenticated (a screen cannot sign in), so
range-check every incoming number rather than trusting it.

### Storing it

Store the **raw numbers**, not just a verdict. The rule is a heuristic over values a
browser chooses to report; when it meets a case it did not anticipate, a person
needs the numbers to adjudicate.

Only treat a reading as current while the heartbeat is fresh. A stale reading
describes how that wall looked whenever the TV last checked in, and presenting that
as live is worse than presenting nothing.

### Surfacing it

Two audiences, two different messages:

- **On the panel** — for whoever is standing there and can fix it. One short line,
  smallest quiet corner. *Learned the hard way:* the first version was a top-left
  box with the full explanation, and over a real board it covered the wordmark and
  the headline company figure. A warning that hides the most important number on
  the wall in order to report that the wall is the wrong size is worse than the
  fault. Bottom-left, terse.
- **In the hub** — for whoever is deciding whether to walk over. Full sentence, the
  measured numbers, and what to do.

Keep it separate from online/offline. A zoomed screen is *online*, and that is
exactly the point.

---

## What this cannot see

**`screen.width` is not reported identically by every browser.** On this hardware it
is zoom-independent, which the ratio depends on. A browser reporting it in CSS
pixels would shrink it in step with `innerWidth`, the ratio would sit at 1 however
zoomed it was, and nothing would be flagged. No false alarm, but no detection —
so "correct" means "nothing detectable is wrong". Validate on any new panel model
before trusting a green result.

**Anything below the web layer is invisible to it.** Worth ruling out at the panel:

- **Picture Size Settings** — want `16:9` with `Fit to Screen` on. `Auto Wide` lets
  the TV re-decide the aspect on its own.
- **Panel Care → Pixel Shift** — nudges a static image on a timer to prevent
  burn-in, and reads as drift. Do not switch it off casually: a static
  bright-on-black dashboard running for weeks is a genuine burn-in risk.

---

## Fixing it at the TV

**Zoomed** — set the browser zoom back to 100%. **Expect it to come back**: one
display returned to 125% on its own hours later. Treat a fix as unconfirmed until
the fault has stayed away for a day.

**Not full screen** — the browser has left kiosk. Hide the toolbar or relaunch.

**Both keep returning, and factory reset is greyed out** — suspect **Hotel /
Hospitality (RM) mode**, which reapplies a stored settings profile. One cause,
both symptoms: reset greyed out *and* your zoom change quietly reverting.

Samsung Tizen **Developer Mode** (Apps → `12345`) is *not* the lever — it exists to
sideload apps, does not ungrey reset, and has no effect on scaling. If hospitality
mode is confirmed, use that model's hotel menu or the reseller. Service-menu codes
vary by model and can misconfigure a panel unrecoverably.

---

## Taking a manual reading

Once the check ships the numbers arrive by heartbeat. For a screen that cannot
report — unpaired, or on an old bundle — open the TV browser console and run:

```js
({ innerWidth, innerHeight, screenW: screen.width, screenH: screen.height,
   dpr: devicePixelRatio, scale: visualViewport?.scale })
```

Compare against the table at the top. If you use a hosted diagnostic page instead,
serve it as a **static file with no auth and no dependency on the player**, so
opening it on a TV cannot disturb what is on the wall.

---

## Two operational notes

**Deleting a diagnostic page does not restore a screen.** A browser parked on a URL
does not navigate itself — remove the file and that TV shows a 404 instead. Point
the screens back *first*, then ship the removal.

**Tune in one place.** If the check ever flags a healthy screen, that is urgent: a
check that cries wolf on a wall is worse than no check. Keep both tolerances in a
single module that the panel-side and hub-side both read, so there is one thing to
change and no way for them to disagree.
