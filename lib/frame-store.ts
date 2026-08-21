import { SEQ_FRAMES } from './frames'

/**
 * Bounded decoded-frame cache.
 *
 * This exists because holding every frame decoded does not fit. 124 frames at
 * 1920x1080 is 0.96GB of bitmap — far past what a browser keeps, so it evicts
 * and re-decodes during the scrub, and a main-thread re-decode mid-scroll is
 * exactly what reads as lag.
 *
 * So: keep the *compressed* blob for every frame (about 19MB at the 1920 tier,
 * nothing is ever re-fetched) and keep only a window of decoded bitmaps around
 * the playhead. `createImageBitmap` also decodes off the main thread in Chrome,
 * which is the other half of the fix.
 */

/** Roughly how much decoded bitmap we are willing to hold, in bytes. */
const BITMAP_BUDGET = 260 * 1024 * 1024

/** How far to decode ahead of the playhead, in the direction of travel. */
const PREFETCH_AHEAD = 8
const PREFETCH_BEHIND = 3

/** Ceiling on concurrent decodes, so a fast scrub cannot queue a storm. */
const MAX_IN_FLIGHT = 12

export type FrameStore = {
  /** Exact frame, if decoded and resident. */
  get(i: number): ImageBitmap | null
  /** Nearest resident frame, so a fast scrub degrades instead of blanking. */
  nearest(i: number): ImageBitmap | null
  /**
   * Move the playhead. Decodes that frame plus a window in the direction of
   * travel, and releases whatever no longer fits the budget.
   */
  request(i: number, direction: number): void
  /** Fires when a new bitmap lands, so the canvas can redraw. */
  subscribe(fn: () => void): () => void
}

export type FrameStoreInternals = {
  store: FrameStore
  /** Hand over a fetched frame. */
  put(i: number, blob: Blob): void
  /** Size the residency window from the tier actually being served. */
  size(width: number, height: number): void
  /** Release every decoded bitmap. */
  dispose(): void
  /** Current resident bitmap count — for diagnostics. */
  residentCount(): number
  maxResident(): number
}

export function createFrameStore(count = SEQ_FRAMES): FrameStoreInternals {
  const blobs: (Blob | undefined)[] = new Array(count)
  const bitmaps = new Map<number, ImageBitmap>()
  const pending = new Set<number>()
  const listeners = new Set<() => void>()

  let playhead = 0
  let maxResident = 32

  const notify = () => listeners.forEach((fn) => fn())

  function trim() {
    if (bitmaps.size <= maxResident) return
    // Furthest from the playhead goes first — least likely to be needed next in
    // either scroll direction.
    // Array.from rather than spread: the tsconfig target does not downlevel
    // Map iterators.
    const byDistance = Array.from(bitmaps.keys()).sort(
      (a, b) => Math.abs(b - playhead) - Math.abs(a - playhead)
    )
    for (const key of byDistance) {
      if (bitmaps.size <= maxResident) break
      // Never evict the playhead or its neighbours: that would guarantee a
      // re-decode on the very next drawn frame.
      if (Math.abs(key - playhead) <= 1) continue
      bitmaps.get(key)!.close()
      bitmaps.delete(key)
    }
  }

  function decode(i: number) {
    if (i < 0 || i >= count) return
    if (bitmaps.has(i) || pending.has(i)) return
    // A fast scrub moves the playhead every frame, so without a ceiling on
    // in-flight decodes we would queue work for frames that are evicted before
    // they are ever drawn. The playhead itself is always allowed through.
    if (pending.size >= MAX_IN_FLIGHT && i !== playhead) return
    const blob = blobs[i]
    if (!blob) return

    pending.add(i)
    createImageBitmap(blob)
      .then((bmp) => {
        pending.delete(i)
        if (bitmaps.has(i)) {
          bmp.close()
          return
        }
        bitmaps.set(i, bmp)
        trim()
        notify()
      })
      .catch(() => {
        pending.delete(i)
      })
  }

  const store: FrameStore = {
    get: (i) => bitmaps.get(i) ?? null,

    nearest(i) {
      const exact = bitmaps.get(i)
      if (exact) return exact
      for (let d = 1; d < count; d++) {
        const lo = bitmaps.get(i - d)
        if (lo) return lo
        const hi = bitmaps.get(i + d)
        if (hi) return hi
      }
      return null
    },

    request(i, direction) {
      playhead = i
      decode(i)
      const aheadStep = direction >= 0 ? 1 : -1
      for (let n = 1; n <= PREFETCH_AHEAD; n++) decode(i + aheadStep * n)
      for (let n = 1; n <= PREFETCH_BEHIND; n++) decode(i - aheadStep * n)
    },

    subscribe(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
  }

  return {
    store,
    put(i, blob) {
      blobs[i] = blob
      /**
       * Decode straight away if this frame is one the playhead is waiting on.
       *
       * Without this the loader and the canvas can deadlock: the canvas asks
       * for frame N on its first tick, the blob has not arrived yet so nothing
       * is decoded, and the render loop then parks. Since the store only
       * notifies on decode *completion*, and no decode was ever started, there
       * is nothing left to wake it — a blank canvas behind a stuck loader,
       * decided purely by whether the fetch beat the first tick.
       */
      if (Math.abs(i - playhead) <= PREFETCH_AHEAD) decode(i)
    },
    size(width, height) {
      const perFrame = Math.max(1, width * height * 4)
      maxResident = Math.max(12, Math.min(count, Math.floor(BITMAP_BUDGET / perFrame)))
    },
    dispose() {
      bitmaps.forEach((b) => b.close())
      bitmaps.clear()
      pending.clear()
      listeners.clear()
    },
    residentCount: () => bitmaps.size,
    maxResident: () => maxResident,
  }
}
