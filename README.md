# VEGA 01 — scrollytelling landing page

A scroll-linked image-sequence landing page for a fictional marque. 192 frames
are scrubbed frame-by-frame on an HTML5 canvas, driven by scroll position.

Next.js 14 (App Router) · Tailwind CSS · Framer Motion · HTML5 Canvas

## Running it

```bash
npm install
npm run prepare-frames   # transcode ../newFrames -> public/frames (required once)
npm run dev
```

`prepare-frames` reads the source JPEGs from `../newFrames`, writes three WebP
tiers into `public/frames`, and regenerates `lib/frame-manifest.json`. The
committed manifest describes 192 frames at 1920×1080. The source directory and
filename prefix are discovered rather than hardcoded, so a new render set at a
different resolution or naming needs no edits — point `SRC` at it and rerun.

`npm run sample-bg` is the eyedropper used to derive the page background; it
prints the sequence's edge colours and is kept for reference.

## The decisions that matter

**The sequence runs assembled, not exploded.** The source frames go from fully
exploded (1) → chassis and monocoque with panels closing in (~45) → complete
car (~96) → tight front-quarter hero (192). The brief described headphones
disassembling; these frames read far better forwards, as an assembly, so the
copy in `components/beats.ts` lands on those actual moments rather than fighting
them.

**The scroll ends at frame 124, not 192.** Frames 125–192 are the camera
continuing into an extreme front-quarter close-up. As a *destination* that crop
reads as the car being cut off rather than composed — a sequence has to land on
a whole object. Frame 124 is the complete car in a full three-quarter view with
clean negative space for the closing line. The trim also drops roughly a third
of the frames from the payload — see the tier figures below.

Nothing is wasted: the discarded tail becomes the Detail section, where the
close crop is the whole point. Those are real positioned crops of real parts —
dropping the full 16:9 frame into a narrow column just shows the entire car
three times over.

**Callouts are anchored in image space, not viewport space.** Because the canvas
is sized to the source 16:9, the image rectangle and the canvas rectangle are
the same box, so a part at normalised (0.55, 0.82) lands on that part at every
breakpoint. Anchors were read off the actual frames — 12 for the exploded
group, 55 for the chassis, 113 for the finished car — and each window is held to
about twelve frames, because the camera dollies throughout and a fixed anchor
held longer visibly drifts off its part. They are hidden below `md`: at a
219px-tall band there is no room for leader lines without burying the car.

They are deliberately loud enough to pull the eye off the car and back. A bare
7px dot lost that competition, so each marker is a reticle — standing ring plus
dot — with a 72px leader that draws itself outward, a tick where the line meets
the label, and 11px/10px type instead of 10px/9px. One ring expands out of the
dot on arrival: driven by scroll progress rather than an infinite pulse, so it
draws attention exactly once, when that part comes into play, and never nags
afterwards. Reduced motion keeps the reticle and drops the ring, the draw and
the slide.

Windows widened from ~0.13 to ~0.17 of progress — about 500px of scroll each at
a 900px viewport — and the fade shortened to 0.018, so more of that span is
spent at full opacity. They are not widened further because the anchors are read
at a single frame each and the camera keeps moving.

`whitespace-nowrap` on the label block is load-bearing: it sits in an absolutely
positioned flex row, so without it every label wraps mid-phrase.

**Seamless blending is done with edge-clamp and feathering, not a matched
colour.** The eyedropper showed the studio backdrop is not flat: it is a
gradient (≈`#101012` at the top, ≈`#3a3941` on the lit floor) and it *brightens
as the camera pushes in*. No single page colour can hide every edge. Instead:

- the canvas keeps the source 16:9 ratio, so no letterbox is generated at all;
- `.feather-edges` fades the canvas into the page, making any seam impossible;
- `draw()` also stretches the image's own outermost pixels into any residual
  sub-pixel gap, as a safety net.

The page background (`#1F1E22`, the `void` token) is the backdrop's own grey,
measured by `scripts/sample-backdrop.mjs`: the mean of the backdrop's
low-saturation pixels across the sequence, which spans #121215 at the darker
quartile to #26262A at the lighter. The whole page sits on it so it reads as the
same studio the car is standing in. `sample-bg.mjs` answers the adjacent
question — what colour meets the canvas edge — and reports a border median of
#18181B; the feather covers that difference.

Lifting the ground from #0E0E11 (luminance 0.0045) to #1F1E22 (0.0134) tripled
the background luminance and pushed the dim text tiers below WCAG AA — bone/50
lands at 4.37:1 on the new grey. bone/55 (4.99:1) is now the floor and every
tier was raised to clear it, which also fixed tiers that were already sub-AA on
black (bone/40 was 3.83:1). Champagne ordinals moved to /80 (4.96:1) for the
same reason, and hairlines went from bone/9% to bone/14% to stay visible on the
lighter ground.

Text is `bone` (#EDE7DB) rather than pure white and the single accent is
`champagne` (#C0A47A): on black, a warm off-white and one metallic read as a
marque where #fff reads as a dashboard. A light serif carries the large numerals
and one word per headline — held to those jobs it reads as a marque, used
everywhere it would read as a wedding invitation. Film grain at 3.8% over the
whole page keeps the flat black from looking cheap.

Sampling a *per-frame* edge colour was tried and rejected: on frame 1 the car's
hood touches the top edge, so a full-width strip average returns `#3e2e37` —
the subject, not the backdrop.

**The blur was the upscale, and the real fix was a bigger source.** The original
set was 1280×720, so a 1920 display drew it 1.50× up and a 2560 one 2×. That
stretch was the blur, and no code removes it: sharpening improves edges, it does
not add resolution.

An intermediate attempt sharpened at native size, which measurably helped
(displayed crispness 1.378 → 1.485) but did not solve it. Shipping a
pre-upscaled 1920 tier built from the 1280 source was measured and rejected —
a Lanczos upscale scored *worse* than the browser stretch (1.357 vs 1.467) for
47% more bytes, because there was no new detail to resample.

The set was then replaced with a genuine 1920×1080 upscale in `../newFrames`.
`scripts/compare-sources.mjs` verified it carries real detail rather than
interpolation, by comparing each new frame against the old one resampled to the
same size:

| frame | new native | old resampled | gain |
|---|---|---|---|
| 12 | 2.122 | 1.429 | +48.5% |
| 55 | 2.124 | 1.374 | +54.6% |
| 90 | 2.231 | 1.319 | +69.2% |
| 113 | 2.279 | 1.329 | +71.5% |
| 124 | 2.208 | 1.318 | +67.6% |

That check matters: a naive stretch would have added bytes and fixed nothing.

**Three tiers, so nothing ever upscales.** 1920 / 1280 / 640, chosen at mount
by viewport width with the `xl` threshold at 1400 — so `full` is only picked
where it would upscale by 9% or less. Measured end to end:

| viewport | tier | canvas | scale vs source |
|---|---|---|---|
| 1920 | xl | 1920×1080 | **1.000× — 1:1** |
| 1440 | xl | 1440×810 | 0.750× (downscale) |
| 1280 | full | 1280×720 | 1:1 for that tier |
| 390 @3x | half | 390×219 | 0.203× (downscale) |

Every case is now a downscale or exactly 1:1. The 1280 and 640 tiers also
improved, because they are Lanczos downscales of real 1920 detail rather than
copies of a 1280 original.

Only the downscaled tiers carry an unsharp mask, and a light one — Lanczos
softens slightly on the way down. The native tier gets none: the source is
already sharp and a mask on top of an upscaled render produces halos on the
body panels. The canvas filter is `high`, measured at 0ms per draw.

Cost: the sequence is 16.97MB at `xl` (140KB/frame), 10.67MB at `full`, 3.12MB
at `half`. That is the price of 1:1 at 1080p and it is a real trade — lower
`quality` in the `xl` tier if bytes matter more than the last of the detail.

**The source rect comes from the decoded image, never the manifest.** Because
three tiers exist, `drawImage` must be given `img.naturalWidth/Height`. Passing
the manifest's dimensions while a smaller tier is loaded puts the image in one
corner of the canvas at the wrong scale — a bug that only reproduces on the
breakpoints served the smaller tier, which is exactly why it survived a desktop
check the first time.

**Backing-store size is capped against the source, not the device.**
`applySize()` caps DPR by the headroom the decoded frame actually has, so the
canvas never renders more pixels than the source can fill. With a 1920 source
that also works in your favour: a 1440 CSS viewport on a 2× display resolves to
a 1920 backing store — exactly 1:1 — rather than a wasteful 2880.

**Tier selection also respects the connection**, not just the viewport:
`save-data` or a reported 2G/3G effective type forces `half` regardless of
screen size.

**Frames load in two passes.** A coarse pass every 6th frame gives the whole
timeline something to show almost immediately; a second pass fills the gaps.
Combined with nearest-loaded-frame fallback in `draw()`, scrolling before the
sequence finishes gives a slightly choppy animation rather than a blank screen.
The reveal gate opens after the coarse pass (~17%).

**Decoded frames are held in a bounded window, not all at once.** This is the
single biggest thing standing between this page and jank. 124 frames at
1920×1080 is **0.96GB** of decoded bitmap — far past what a browser keeps, so
it evicts and re-decodes during the scrub, and a main-thread re-decode
mid-scroll is exactly what reads as lag.

`lib/frame-store.ts` keeps the *compressed* blob for every frame (~19MB at the
1920 tier, so nothing is ever re-fetched) and only a window of decoded bitmaps
around the playhead:

- residency is a byte budget (260MB) divided by the actual decoded frame size,
  so the window is ~30 frames at 1920 and the whole sequence at 640 — the
  small tier behaves exactly as it did before;
- `createImageBitmap` is used rather than `img.decode()` because it decodes
  off the main thread in Chrome;
- prefetch is directional — 8 frames ahead in the direction of travel, 3
  behind — with a ceiling of 12 concurrent decodes so a fast scrub cannot
  queue a storm of work for frames that get evicted before they are drawn;
- eviction is by distance from the playhead, and never touches the playhead or
  its immediate neighbours, which would guarantee a re-decode on the next
  drawn frame.

When the exact frame is not resident the canvas draws the nearest one it has
and marks the draw approximate, so a fast scrub degrades in smoothness rather
than blanking.

A subtlety worth keeping: the store notifies on every decode, but the canvas
only invalidates **if what is on screen is a fallback**. Redrawing on every
decode meant up to a dozen redundant draws of the already-correct frame per
step of the scrub, and cost 50% of the frame budget (p50 49.9ms → 33.4ms once
fixed).

| | p50 | p95 | memory |
|---|---|---|---|
| eager decode, 1920 | 33.4ms | 66.6ms | tried to hold ~1GB |
| windowed store | 33.4ms | **50.1ms** | **+363MB, bounded** |

Reduced motion gets a short smoothing constant (0.018s) rather than zero.
Zero was wrong: wheel scroll arrives in ~100px chunks, so with no easing at
all the sequence visibly steps between notches, which reads as lag rather than
as restraint. The remaining 33.4ms floor is the GPU-less headless environment
rasterising a 1920×1080 canvas, not JS — see the caveat below.

**Sub-frame blending is what makes the scrub continuous.** The sequence is 124
frames over ~3240px, so one whole frame is ~26px of scroll — meaning a normal
wheel scroll produces only about 20 frame changes a second no matter how well
the loop performs. Easing cannot fix that: the frames are discrete, so the
motion is inherently stepped.

So the canvas draws at a *fractional* position, cross-fading the two frames
either side of it with `globalAlpha`. Verified directly rather than assumed —
parked at frame index 60.5, the painted canvas sits equidistant between frames
61 and 62 (patch distance 6 to each, while the two frames differ by 12), which
is a 50/50 blend. Measured effect at a realistic wheel speed:

| canvas | p50 | distinct visual states / ticks |
|---|---|---|
| 641×360 (phone) | 16.7ms | 336 / 337 |
| 1280×720 | 16.7ms | 317 / 319 |
| 1920×1080 | 33.4ms | 398 / 399 |

Nearly every animation frame is now a distinct image. Without blending the
ceiling is ~124 — one new state per source frame — and the rest of the ticks
repaint something identical.

Blending is **earned, not assumed**: it costs a second full-canvas draw, so an
EMA of the frame interval gates it, dropping out above 30ms and resuming below
22ms (hysteresis, so it cannot flap frame to frame). That means it can improve
a scroll with budget to spare and can never make a struggling one worse. The
thresholds deliberately give it the benefit of the doubt — continuous motion at
40fps generally reads smoother than stepped motion at 60fps.

Two supporting changes: the redraw threshold is a twentieth of a frame (~1.3px
of scroll) rather than a whole index step, since the fractional position has
to drive repaints; and the smoothing constant went 0.055s → 0.075s, with
reduced motion at 0.045s rather than the 0.018s it had been.

**A deadlock this uncovered, worth keeping in mind when touching the store.**
The canvas requests frame N on its first tick. If that blob has not arrived
yet the store cannot decode it, and the render loop — already settled at
progress 0 — parks. Because the store only notified on decode *completion*,
and no decode had been started, nothing was left to wake it: a blank canvas
behind a loader that never lifted, decided purely by whether the fetch beat
the first tick. It reproduced in roughly one cold load in three at the 1920
tier, where the frames are largest.

Two things fix it, and both matter. `put()` now decodes immediately if the
arriving frame is one the playhead is waiting on, so a late fetch cannot leave
the loop stranded. And the canvas tracks *needs a redraw* rather than *painted
from a neighbour* — the old flag could not represent "nothing painted at all",
so the wake signal was suppressed in exactly the state that needed it. Five
consecutive cold loads at 1920 now paint.

The canvas also repaints on `contextlost`/`contextrestored`, on regaining
visibility, and on resize. A 2D backing store is not guaranteed to survive
memory pressure, and with a 1920×1080 canvas plus a 260MB bitmap window that is
a real possibility — without a recovery path a discarded store would stay
blank permanently, for the same reason the deadlock did.

**The render loop parks itself.** Scroll position is smoothed with a
frame-rate-independent exponential (`1 - exp(-dt/τ)`, τ=55ms) so it feels the
same at 60Hz and 120Hz, and the loop `return`s instead of re-scheduling once it
has caught up. An `IntersectionObserver` stops it entirely when the sequence is
off-screen. Redraws only happen when the committed frame index changes.

## Reduced motion does not withhold the sequence

The sequence renders for everyone, `prefers-reduced-motion` included. Gating it
behind that flag was tried and was wrong: on Windows the flag is set simply by
turning off "Animation effects", which people do for performance with no intent
to disable content — so the entire point of the page silently disappeared, with
no way back.

Scrubbing here is animation *from interaction*: frames advance only because the
visitor scrolls, the same category as scrolling any image into view. What
reduced motion does suppress is the autonomous part:

- the parallax drift on the beat copy (crossfade only, nothing travels);
- the easing lag — `smoothing={0}` pins the frame to scroll position exactly.

WCAG 2.3.3 still requires interaction-triggered motion to be switchable off, so
there is a **Static view** control on the sequence and a **Play sequence**
control on the spread. The choice is offered, not made on the visitor's behalf.

Both are rendered on the server identically, which keeps hydration honest
(branching on the media query during the first render throws React error #418)
and avoids a document-height jump on mount. A `<noscript>` block collapses the
timeline and tells the story statically when JS never arrives.

## Accessibility

- `prefers-reduced-motion` keeps the scrub but removes the parallax drift and
  the easing lag; a **Static view** control drops to the static spread for
  anyone who wants no scrubbing at all.
- The hero's entrance is CSS, not Framer, so the headline is never gated behind
  hydration — a JS-gated `opacity: 0` would hide it outright if JS failed.
- If more than half the frames fail to download, the static spread is shown
  instead of a loader that never finishes.
- The canvas is `aria-hidden`; the narrative is real text in the DOM. Skip link,
  visible focus rings, and semantic `dl`/`ol` throughout.

## Measured

Headless Chrome (software rasterisation, `--disable-gpu`), production build:

| | result |
|---|---|
| `drawImage` at 1512×851 | 0.1ms worst of 60 |
| idle inside the pinned section | 16.7ms p50 — loop parks, no idle burn |
| scrub at 641×360 (phone) | 16.7ms p50 (60fps) |
| scrub at 1512×851 (desktop) | 33.3ms p50 |
| memory after all 192 frames | +40MB |

The desktop 33.3ms floor is raster-bound, not JS-bound: `drawImage` is
effectively free, and removing the CSS mask and the scrims moves p50 not at all.
It is exactly two vsync intervals of software blitting a 1.29M-pixel canvas.
**This number is an artefact of a GPU-less headless environment and should not
be read as real-world performance** — the same code holds 60fps in the same
environment once the canvas is small enough to raster in one interval. Verify on
real hardware with a GPU before trusting a 60fps claim.

## Layout note

The canvas holds the source 16:9 at every breakpoint rather than cropping to
fill, because the exploded frames place components right at the image edges — a
`cover` fit on a portrait phone would clip them off. On a phone the sequence is
therefore a centred band with the beat copy above and below it.
