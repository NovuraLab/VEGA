import manifest from './frame-manifest.json'

/** Everything that exists on disk. */
export const TOTAL_FRAMES = manifest.count
export const FRAME_WIDTH = manifest.width
export const FRAME_HEIGHT = manifest.height
/** Used for the canvas stage, so it always matches the real source. */
export const FRAME_ASPECT = `${manifest.width} / ${manifest.height}`

/**
 * The scroll sequence stops at 124, not at the full set.
 *
 * The remaining frames are the camera continuing to dolly into an extreme
 * front-quarter close-up. As a *destination* that crop reads as the car being
 * cut off rather than composed — the sequence has to land on a whole object.
 * Frame 124 is the complete car in a full three-quarter view with clean
 * negative space top-left for the closing line.
 *
 * The remaining frames are not wasted: they are deliberate tight crops, used as
 * the stills in the Detail section where a close crop is the point.
 */
export const SEQ_FRAMES = 124

/** Stills borrowed from the tail of the sequence for the Detail section. */
export const DETAIL_FRAMES = [140, 165, 192] as const

export type Tier = 'xl' | 'full' | 'half'

/**
 * How far the pinned sequence scrolls. 100vh of this is consumed by the sticky
 * viewport itself, so the scrub happens over (SCROLL_VH - 100)vh — roughly
 * 26px of scroll per frame on a laptop across 124 frames, which is unhurried
 * enough to read the callouts.
 */
export const SCROLL_VH = 460

export function frameUrl(index: number, tier: Tier): string {
  const n = String(index + 1).padStart(4, '0')
  return `/frames/${tier}/frame_${n}.webp`
}

/**
 * Tier widths are 1920 / 1280 / 640, and the source is 1920 — so `xl` draws
 * 1:1 on a 1080p display, which is what actually removes the blur. The
 * threshold sits at 1400 so `full` is only ever chosen where it upscales by
 * 9% or less; past that the extra bytes for a sharp 1:1 are worth it.
 *
 * Decided once on mount — swapping tiers mid-session would mean re-downloading
 * the sequence for no visible gain.
 */
export function pickTier(): Tier {
  if (typeof window === 'undefined') return 'half'

  const conn = (navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string }
  }).connection
  if (conn?.saveData) return 'half'
  if (conn?.effectiveType && /(2g|slow-2g|3g)$/.test(conn.effectiveType)) return 'half'

  const w = window.innerWidth
  if (w >= 1400) return 'xl'
  if (w >= 820) return 'full'
  return 'half'
}

/**
 * Frames are fetched in two passes. The first walks the sequence in coarse
 * strides so that every part of the timeline has *something* to show almost
 * immediately; the second fills the gaps in order. Combined with
 * nearest-loaded-frame fallback at draw time, this means a visitor who scrolls
 * before the sequence finishes loading sees a slightly choppy animation rather
 * than an empty screen.
 */
export const COARSE_STRIDE = 6

export function loadOrder(count: number, stride = COARSE_STRIDE): number[] {
  const coarse: number[] = []
  for (let i = 0; i < count; i += stride) coarse.push(i)
  if (coarse[coarse.length - 1] !== count - 1) coarse.push(count - 1)

  const seen = new Set(coarse)
  const rest: number[] = []
  for (let i = 0; i < count; i++) if (!seen.has(i)) rest.push(i)

  return [...coarse, ...rest]
}

/** Frames that must be present before we reveal the sequence. */
export const GATE_COUNT = Math.ceil(SEQ_FRAMES / COARSE_STRIDE) + 1
