'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion'
import FrameCanvas from './FrameCanvas'
import SequenceFallback from './SequenceFallback'
import Callouts from './Callouts'
import { BEATS, type Beat } from './beats'
import { FRAME_ASPECT, SEQ_FRAMES, SCROLL_VH } from '@/lib/frames'
import { useFrameLoader } from '@/lib/useFrameLoader'

/** Fade width, in progress units, at each end of a beat's range. */
const FADE = 0.045

function BeatBlock({
  beat,
  progress,
  reduced,
}: {
  beat: Beat
  progress: MotionValue<number>
  reduced: boolean
}) {
  const { from, to } = beat

  // The closing beat is the page's final statement, so it holds at full opacity
  // through the end of the timeline instead of fading out as you arrive at it.
  const holdsToEnd = to >= 1
  const opacity = useTransform(
    progress,
    holdsToEnd
      ? [from, Math.min(from + FADE, to), 1]
      : [from, Math.min(from + FADE, to), Math.max(to - FADE, from), to],
    holdsToEnd ? [0, 1, 1] : [0, 1, 1, 0]
  )

  // Parallax: the copy drifts against the scroll direction so it reads as a
  // separate plane from the car. Transform and opacity only — a blur filter
  // here would repaint five overlays on every scroll frame.
  const drift = useTransform(progress, [from, to], [42, -42])

  const isCenter = beat.side === 'center'
  const alignRight = beat.side === 'right'

  return (
    <motion.div
      // Reduced motion keeps the crossfade but drops the drift: nothing then
      // moves across the screen on its own.
      style={{ opacity, y: reduced ? 0 : drift }}
      className={[
        'absolute z-20 max-w-[20rem] sm:max-w-[23rem]',
        isCenter
          ? 'left-6 bottom-24 max-w-[30rem] sm:left-10 md:bottom-1/2 md:left-16 md:translate-y-1/2 lg:left-24'
          : alignRight
            ? 'right-6 top-24 sm:right-10 md:right-16 md:top-28 md:text-right lg:right-24 lg:top-32'
            : 'bottom-28 left-6 sm:left-10 md:bottom-28 md:left-16 lg:bottom-32 lg:left-24',
      ].join(' ')}
    >
      {/* Edgeless scrim — lifts the copy off a lit body panel without drawing
          a panel of its own. */}
      <div
        aria-hidden="true"
        className={[
          'pointer-events-none absolute -inset-x-24 -inset-y-24 -z-10',
          alignRight ? 'scrim-r' : 'scrim-l',
        ].join(' ')}
      />

      <p
        className={[
          'text-halo mb-4 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.34em] text-champagne',
          alignRight ? 'md:flex-row-reverse' : '',
        ].join(' ')}
      >
        <span aria-hidden="true" className="block h-px w-8 bg-champagne/50" />
        {beat.eyebrow}
      </p>
      <h3
        className={[
          'text-halo font-light tracking-tightest text-bone',
          isCenter ? 'text-5xl sm:text-6xl lg:text-8xl' : 'text-4xl sm:text-5xl lg:text-6xl',
        ].join(' ')}
      >
        {beat.title}
      </h3>
      <p className="text-halo mt-5 max-w-[34ch] text-sm leading-relaxed text-bone/75 sm:text-[15px]">
        {beat.body}
      </p>
    </motion.div>
  )
}

export default function SequenceCanvas({ onStaticView }: { onStaticView?: () => void }) {
  const wrapRef = useRef<HTMLElement>(null)
  const counterRef = useRef<HTMLSpanElement>(null)

  // Read post-mount only. Branching on the media query during the first render
  // would disagree with the server and break hydration.
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const { ready, progress: loadProgress, complete, failed, store } = useFrameLoader(true)

  const { scrollYProgress } = useScroll({
    target: wrapRef,
    offset: ['start start', 'end end'],
  })

  // Writing straight to the DOM keeps the readout at 60fps without putting
  // React through a render per frame.
  const onFrame = useCallback((index: number) => {
    const el = counterRef.current
    if (el) el.textContent = String(index + 1).padStart(3, '0')
  }, [])

  // Decoding is asynchronous, so `ready` (enough frames *fetched*) is not the
  // same as having something on screen. Lifting the gate on fetch progress
  // alone reveals a blank canvas for a beat.
  const [painted, setPainted] = useState(false)
  const onFirstPaint = useCallback(() => setPainted(true), [])

  const railScale = useTransform(scrollYProgress, [0, 1], [0, 1])

  // A sequence that mostly failed to download is better shown as the static
  // spread than as a loader that never finishes.
  if (failed) return <SequenceFallback />

  return (
    /* The section's own height is the animation's timeline. */
    <section
      ref={wrapRef}
      data-sequence=""
      aria-labelledby="sequence-heading"
      className="relative bg-void"
      style={{ height: `${SCROLL_VH}vh` }}
    >
      {/* Without JavaScript the canvas never paints and the loading gate would
          sit there forever, so collapse the timeline and tell the story
          statically instead. */}
      <noscript>
        <style
          dangerouslySetInnerHTML={{
            __html:
              '[data-sequence]{height:auto!important}[data-sequence] [data-interactive]{display:none!important}',
          }}
        />
        <div className="px-6 py-16">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/frames/poster.webp"
            alt="The VEGA 01, a crimson mid-engined coupe, in a dark studio."
            width={1600}
            height={900}
            className="mx-auto w-full max-w-5xl"
          />
          <ul className="mx-auto mt-14 grid max-w-5xl gap-10 sm:grid-cols-2">
            {BEATS.map((b) => (
              <li key={b.id}>
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-champagne">
                  {b.eyebrow}
                </p>
                <h3 className="text-2xl font-light tracking-tightest text-bone">{b.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-bone/70">{b.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </noscript>

      <div data-interactive="" className="sticky top-0 h-screen w-full overflow-hidden">
        <h2 id="sequence-heading" className="sr-only">
          How the VEGA 01 is built, told through an exploded assembly sequence
        </h2>

        {/* The stage is exactly the image rectangle: source 16:9, never taller
            than the viewport. Because the canvas fills it, the callouts can be
            positioned in normalised image coordinates and land on the right
            parts at any breakpoint. */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="relative"
            style={{
              width: 'min(100%, calc(100vh * 16 / 9))',
              aspectRatio: FRAME_ASPECT,
            }}
          >
            <FrameCanvas
              progress={scrollYProgress}
              store={store}
              onFrame={onFrame}
              onFirstPaint={onFirstPaint}
              loadingComplete={complete}
              // Reduced motion gets a shorter time constant, not zero: wheel
              // scroll arrives in ~100px chunks, and with no easing at all the
              // sequence visibly steps between notches, which reads as lag.
              smoothing={reduced ? 0.045 : undefined}
              className="feather-edges absolute inset-0 h-full w-full"
            />
            <Callouts progress={scrollYProgress} reduced={reduced} />
          </div>
        </div>

        {BEATS.map((beat) => (
          <BeatBlock key={beat.id} beat={beat} progress={scrollYProgress} reduced={reduced} />
        ))}

        {/* Scroll HUD. Sits bottom-right, clear of both the top-right and
            bottom-left copy positions. The phase name is deliberately not
            repeated here — the active beat already states it. */}
        <div className="pointer-events-none absolute bottom-8 right-6 z-20 hidden items-center gap-4 md:right-10 md:flex">
          <p className="font-mono text-[10px] tracking-[0.2em] text-bone/65">
            <span ref={counterRef}>001</span>
            <span className="text-bone/55"> / {SEQ_FRAMES}</span>
          </p>
          <div className="relative h-px w-32 overflow-hidden bg-bone/20">
            <motion.div
              style={{ scaleX: railScale }}
              className="absolute inset-0 origin-left bg-champagne"
            />
          </div>
        </div>

        {/* WCAG 2.3.3: interaction-triggered motion must be switchable off. */}
        {onStaticView && (
          <button
            type="button"
            onClick={onStaticView}
            className="absolute bottom-8 left-6 z-20 font-mono text-[10px] uppercase tracking-[0.24em] text-bone/55 transition-colors duration-300 hover:text-champagne md:left-10"
          >
            Static view
          </button>
        )}

        {/* Loading gate — the sequence is only revealed once enough of the
            timeline exists to scrub without holes. */}
        <div
          aria-hidden="true"
          className={[
            'absolute inset-0 z-30 flex items-center justify-center bg-void transition-opacity duration-700 ease-editorial',
            ready && painted ? 'pointer-events-none opacity-0' : 'opacity-100',
          ].join(' ')}
        >
          <div className="flex w-56 flex-col items-center gap-4">
            <div className="h-px w-full overflow-hidden bg-bone/18">
              <div
                className="h-full bg-champagne transition-[width] duration-300 ease-out"
                style={{ width: `${Math.round(loadProgress * 100)}%` }}
              />
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-bone/55">
              {`Loading sequence ${Math.round(loadProgress * 100)}%`}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
