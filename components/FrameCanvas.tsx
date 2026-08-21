'use client'

import { useEffect, useRef } from 'react'
import type { MotionValue } from 'framer-motion'
import { SEQ_FRAMES, FRAME_HEIGHT, FRAME_WIDTH } from '@/lib/frames'
import type { FrameStore } from '@/lib/frame-store'

type Props = {
  progress: MotionValue<number>
  store: FrameStore
  /** Called when the nearest whole frame changes. Must be cheap — no setState. */
  onFrame?: (index: number, progress: number) => void
  /** Fires once, the first time a frame is actually on the canvas. */
  onFirstPaint?: () => void
  loadingComplete?: boolean
  /**
   * Smoothing time constant in seconds. Higher eases harder against scroll
   * quantisation at the cost of latency; 0 pins to the scroll position exactly.
   */
  smoothing?: number
  className?: string
  style?: React.CSSProperties
}

/** Source pixels stretched into any residual letterbox. */
const EDGE_CLAMP = 4
/** Smoothing time constant, seconds. Low enough to still feel scroll-locked. */
const TAU = 0.075

/**
 * Redraw threshold, in frames. The sequence is 124 frames over ~3240px, so one
 * whole frame is ~26px of scroll — meaning a normal scroll produces only ~20
 * frame changes a second. Sub-frame blending is what closes that gap, and it
 * needs a redraw whenever the fractional position moves, not just when the
 * integer index does. A twentieth of a frame is ~1.3px of scroll.
 */
const REDRAW_EPSILON = 0.05

/** Below this the second frame contributes nothing worth the draw. */
const BLEND_FLOOR = 0.02

/**
 * Blending costs a second full-canvas draw, so it is earned rather than
 * assumed. An EMA of the frame interval decides: above the drop threshold we
 * fall back to single-frame draws until there is headroom again. Hysteresis
 * keeps it from flapping frame to frame.
 *
 * This means blending can improve a scroll that has budget to spare and can
 * never make a struggling one worse.
 */
// Tuned to give blending the benefit of the doubt: continuous motion at 40fps
// generally reads smoother than stepped motion at 60fps, so it only bails out
// when the machine is genuinely struggling below ~33fps.
const BLEND_DROP_MS = 30
const BLEND_RESUME_MS = 22

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

export default function FrameCanvas({
  progress,
  store,
  onFrame,
  onFirstPaint,
  loadingComplete = false,
  smoothing = TAU,
  className,
  style,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const completeRef = useRef(loadingComplete)
  completeRef.current = loadingComplete

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    let raf = 0
    let running = false
    let visible = true
    let sizeDirty = true
    let lastDrawnExact = -1
    let lastReported = -1
    let lastRequested = -1
    let direction = 1
    /**
     * True whenever the canvas does not yet show the exact frame for the
     * current position — including before anything at all has been painted.
     *
     * This has to cover both cases. At progress 0 the loop is settled on its
     * first tick, so it parks before the first bitmap has decoded; if the wake
     * signal only fired for "painted from a neighbour", nothing would ever
     * repaint and the sequence would sit black behind a stuck loader.
     */
    let needsRedraw = true
    let painted = false
    let lastTime = 0
    let current = clamp01(progress.get())
    // Frame-interval EMA, and whether blending is currently affordable.
    let frameEma = 16.7
    let blendOk = true

    /**
     * The loader picks a tier at runtime, so the source dimensions are whatever
     * actually decoded — never assume the manifest's size or the draw is scaled
     * wrong.
     */
    let srcW = FRAME_WIDTH
    let srcH = FRAME_HEIGHT
    let srcKnown = false

    function learnSource(img: ImageBitmap) {
      if (srcKnown || !img.width) return
      srcW = img.width
      srcH = img.height
      srcKnown = true
      sizeDirty = true
    }

    function applySize() {
      const cssW = canvas!.clientWidth
      const cssH = canvas!.clientHeight
      if (!cssW || !cssH) return false

      // Cap DPR by the headroom the decoded frame actually has, so the canvas
      // never renders more pixels than the source can fill.
      const containAt1 = Math.min(cssW / srcW, cssH / srcH)
      const dpr = Math.min(
        window.devicePixelRatio || 1,
        2,
        Math.max(1, 1 / Math.max(containAt1, 0.0001))
      )

      const bw = Math.round(cssW * dpr)
      const bh = Math.round(cssH * dpr)
      if (canvas!.width !== bw || canvas!.height !== bh) {
        canvas!.width = bw
        canvas!.height = bh
      }
      // Resizing a canvas resets context state.
      ctx!.imageSmoothingEnabled = true
      ctx!.imageSmoothingQuality = 'high'
      return true
    }

    /** Paints one frame, optionally composited over what is already there. */
    function paint(img: ImageBitmap, alpha: number) {
      const iw = img.width || srcW
      const ih = img.height || srcH
      const cw = canvas!.width
      const ch = canvas!.height
      if (!iw || !ih || !cw || !ch) return false

      const scale = Math.min(cw / iw, ch / ih)
      const dw = iw * scale
      const dh = ih * scale
      const dx = (cw - dw) / 2
      const dy = (ch - dh) / 2

      if (alpha < 1) ctx!.globalAlpha = alpha
      ctx!.drawImage(img, 0, 0, iw, ih, dx, dy, dw, dh)

      // Edge strip in source pixels, so it is the same visual depth whichever
      // tier loaded.
      const strip = Math.max(2, Math.round((EDGE_CLAMP * iw) / FRAME_WIDTH))

      // Safety net for sub-pixel rounding and any aspect drift: continue the
      // image's own outermost pixels into the gap so no edge can appear.
      if (dy >= 1) {
        ctx!.drawImage(img, 0, 0, iw, strip, dx, 0, dw, dy + 1)
        ctx!.drawImage(
          img, 0, ih - strip, iw, strip,
          dx, dy + dh - 1, dw, ch - (dy + dh) + 1
        )
      }
      if (dx >= 1) {
        ctx!.drawImage(img, 0, 0, strip, ih, 0, dy, dx + 1, dh)
        ctx!.drawImage(
          img, iw - strip, 0, strip, ih,
          dx + dw - 1, dy, cw - (dx + dw) + 1, dh
        )
      }
      if (alpha < 1) ctx!.globalAlpha = 1
      return true
    }

    /**
     * Draws the sequence at a fractional position by cross-fading the two
     * frames either side of it. The frames are discrete, so easing alone cannot
     * make the motion continuous — blending can, and at ~0ms per drawImage the
     * second draw is affordable.
     *
     * Returns whether the exact pair was available; a partial result still
     * paints, it just reports itself as needing a redraw so it is retried.
     */
    function draw(exact: number) {
      const i0 = Math.min(SEQ_FRAMES - 1, Math.max(0, Math.floor(exact)))
      const i1 = Math.min(SEQ_FRAMES - 1, i0 + 1)
      const frac = exact - i0

      const a = store.get(i0)
      const base = a ?? store.nearest(i0)
      if (!base) return { painted: false, exactPair: false }
      learnSource(base)
      if (!paint(base, 1)) return { painted: false, exactPair: false }

      // Only blend when the neighbour is genuinely resident. Blending toward a
      // far-away fallback would smear, so it is skipped rather than faked.
      let blended = false
      if (blendOk && frac > BLEND_FLOOR && i1 !== i0) {
        const b = store.get(i1)
        if (b) {
          paint(b, frac)
          blended = true
        }
      }

      const exactPair = !!a && (!blendOk || frac <= BLEND_FLOOR || blended)
      return { painted: true, exactPair }
    }

    function tick(time: number) {
      const target = clamp01(progress.get())
      const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.1) : 0
      lastTime = time

      // Frame-rate independent exponential smoothing: identical feel at 60Hz
      // and 120Hz, unlike a fixed per-frame lerp factor.
      current +=
        (target - current) * (dt && smoothing > 0 ? 1 - Math.exp(-dt / smoothing) : 1)

      const settled = Math.abs(target - current) < 0.00025
      if (settled) current = target

      // Track the real frame interval and decide whether a second draw fits.
      if (dt > 0) {
        const ms = dt * 1000
        frameEma += (ms - frameEma) * 0.2
        if (blendOk && frameEma > BLEND_DROP_MS) blendOk = false
        else if (!blendOk && frameEma < BLEND_RESUME_MS) blendOk = true
      }

      if (sizeDirty) {
        sizeDirty = !applySize()
        lastDrawnExact = -1
      }

      const exact = current * (SEQ_FRAMES - 1)
      const index = Math.min(SEQ_FRAMES - 1, Math.max(0, Math.round(exact)))

      // Direction of travel drives which side of the playhead gets decoded.
      if (index !== lastRequested) {
        direction = index >= lastRequested ? 1 : -1
        lastRequested = index
        store.request(index, direction)
      }

      const moved = Math.abs(exact - lastDrawnExact) > REDRAW_EPSILON
      if (moved || needsRedraw) {
        const { painted: didPaint, exactPair } = draw(exact)
        if (didPaint) {
          if (!painted) {
            painted = true
            onFirstPaint?.()
          }
          lastDrawnExact = exact
          needsRedraw = !exactPair
          if (index !== lastReported) {
            lastReported = index
            onFrame?.(index, current)
          }
        } else {
          // Nothing resident yet. Stay dirty so the store's notification wakes
          // us the moment a frame decodes.
          needsRedraw = true
        }
      }

      // Park the loop once we've caught up — no idle rAF burning battery on a
      // static screen.
      // Park even when a redraw is still owed: store.subscribe wakes us the
      // moment the missing frame decodes, so spinning rAF here would burn CPU
      // for nothing.
      if (settled && !sizeDirty && visible) {
        running = false
        lastTime = 0
        return
      }
      if (!visible) {
        running = false
        lastTime = 0
        return
      }
      raf = requestAnimationFrame(tick)
    }

    function kick() {
      if (running || !visible) return
      running = true
      lastTime = 0
      raf = requestAnimationFrame(tick)
    }

    // First paint: snap straight to the current scroll position.
    kick()

    const unsubscribe = progress.on('change', kick)

    const ro = new ResizeObserver(() => {
      // A resize reallocates (and clears) the backing store.
      sizeDirty = true
      needsRedraw = true
      lastDrawnExact = -1
      kick()
    })
    ro.observe(canvas)

    /** Anything that can invalidate the painted pixels routes through here. */
    function invalidate() {
      needsRedraw = true
      lastDrawnExact = -1
      kick()
    }

    // Don't run the loop for a sequence that's off-screen. Coming back into
    // view also repaints: the backing store may not have survived the trip.
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting
        if (visible) invalidate()
      },
      { rootMargin: '25% 0px' }
    )
    io.observe(canvas)

    // Chrome can discard a 2D backing store under memory pressure and fires
    // these; without handling them the canvas would stay blank for good.
    const onContextLost = (e: Event) => {
      e.preventDefault()
      invalidate()
    }
    canvas.addEventListener('contextlost', onContextLost)
    canvas.addEventListener('contextrestored', invalidate)

    // Returning to a backgrounded tab is the other common way to find the
    // pixels gone.
    const onVisibility = () => {
      if (document.visibilityState === 'visible') invalidate()
    }
    document.addEventListener('visibilitychange', onVisibility)

    // Redraw when a decode lands — but only if what is on screen is a fallback.
    // Redrawing on every decode would mean up to a dozen redundant draws of the
    // already-correct frame per step of the scrub.
    const unsubscribeStore = store.subscribe(() => {
      // Only wake for a decode we are actually waiting on. Redrawing on every
      // decode would mean up to a dozen redundant draws of the already-correct
      // frame per step of the scrub.
      if (!needsRedraw) return
      lastDrawnExact = -1
      kick()
    })

    return () => {
      unsubscribe()
      ro.disconnect()
      io.disconnect()
      unsubscribeStore()
      canvas.removeEventListener('contextlost', onContextLost)
      canvas.removeEventListener('contextrestored', invalidate)
      document.removeEventListener('visibilitychange', onVisibility)
      cancelAnimationFrame(raf)
    }
  }, [progress, store, onFrame, onFirstPaint, smoothing])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={style}
      // The narrative is carried by real text in the DOM; the canvas is the
      // decorative rendering of it.
      aria-hidden="true"
    />
  )
}
