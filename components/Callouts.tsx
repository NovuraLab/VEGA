'use client'

import { motion, useTransform, type MotionValue } from 'framer-motion'
import { CALLOUTS, type Callout } from './callout-data'

/** Leader line length in px. */
const LEADER = 72
/** Fade width, in progress units, at each end of a callout's window. */
const FADE = 0.018

function Marker({
  c,
  progress,
  reduced,
}: {
  c: Callout
  progress: MotionValue<number>
  reduced: boolean
}) {
  const { from, to } = c
  const right = c.side === 'right'

  const opacity = useTransform(progress, [from, from + FADE, to - FADE, to], [0, 1, 1, 0])

  // Entry window, shared by everything that animates on arrival.
  const entry = useTransform(progress, [from, from + FADE * 2.2], [0, 1])

  // The leader draws itself outward from the dot.
  const draw = useTransform(entry, [0, 1], [0, 1])
  // The label settles in toward the dot rather than simply appearing.
  const slide = useTransform(entry, [0, 1], [right ? -10 : 10, 0])

  // A single ring expands out of the dot as the callout arrives, then is gone.
  // Scroll-driven rather than an infinite pulse: it draws the eye exactly once,
  // when that part comes into play, and never nags afterwards.
  const pingScale = useTransform(entry, [0, 1], [0.5, 2.6])
  const pingFade = useTransform(entry, [0, 0.55, 1], [0.85, 0.3, 0])

  return (
    <motion.div
      style={{ opacity, left: `${c.x * 100}%`, top: `${c.y * 100}%` }}
      className="absolute"
    >
      {/* Reticle, centred exactly on the anchor point. The standing ring is
          what makes the marker findable at a glance — a bare dot was too quiet
          to compete with the car. */}
      <span className="absolute -translate-x-1/2 -translate-y-1/2">
        {!reduced && (
          <motion.span
            style={{ scale: pingScale, opacity: pingFade }}
            className="absolute left-1/2 top-1/2 block h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-champagne"
          />
        )}
        <span className="absolute left-1/2 top-1/2 block h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-champagne/55" />
        <span className="relative block h-[7px] w-[7px] rounded-full bg-champagne shadow-[0_0_0_3px_rgba(31,30,34,0.85),0_0_20px_rgba(192,164,122,0.45)]" />
      </span>

      <motion.div
        style={{ x: reduced ? 0 : slide }}
        className={[
          'absolute top-0 flex -translate-y-1/2 items-center',
          right ? 'left-0' : 'right-0 flex-row-reverse',
        ].join(' ')}
      >
        {/* Gradient so the line emerges from the reticle rather than butting
            into it. Mirrored for left-side callouts. */}
        <motion.span
          aria-hidden="true"
          style={{
            width: LEADER,
            scaleX: reduced ? 1 : draw,
            transformOrigin: right ? 'left center' : 'right center',
          }}
          className={[
            'mx-2.5 block h-px shrink-0',
            right
              ? 'bg-gradient-to-r from-champagne/25 via-champagne to-champagne'
              : 'bg-gradient-to-l from-champagne/25 via-champagne to-champagne',
          ].join(' ')}
        />

        {/* Tick at the label end — makes the line read as an annotation rather
            than a stray hairline. */}
        <span aria-hidden="true" className="block h-3.5 w-px shrink-0 bg-champagne/70" />

        {/* nowrap is load-bearing: the label sits in an absolutely positioned
            flex row, so without it the box collapses and every label wraps. */}
        <div
          className={[
            'relative whitespace-nowrap',
            right ? 'pl-3.5 text-left' : 'pr-3.5 text-right',
          ].join(' ')}
        >
          <span
            aria-hidden="true"
            className="scrim-callout pointer-events-none absolute -inset-x-8 -inset-y-7 -z-10 block"
          />
          <p className="callout-halo text-[11px] font-medium uppercase leading-none tracking-[0.16em] text-bone">
            {c.label}
          </p>
          <p className="callout-halo mt-1.5 font-mono text-[10px] leading-none tracking-[0.1em] text-champagne">
            {c.value}
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}

/**
 * Overlays the canvas exactly, so normalised image coordinates land on the
 * right parts. Must be a sibling of the canvas inside the stage element.
 */
export default function Callouts({
  progress,
  reduced,
}: {
  progress: MotionValue<number>
  reduced: boolean
}) {
  return (
    // Hidden on small screens: at a 219px-tall band there is no room for
    // leader lines and labels without burying the car.
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 hidden md:block">
      {CALLOUTS.map((c) => (
        <Marker key={c.id} c={c} progress={progress} reduced={reduced} />
      ))}
    </div>
  )
}
