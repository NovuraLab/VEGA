'use client'

import { useEffect, useRef, useState } from 'react'
import { createFrameStore, type FrameStore, type FrameStoreInternals } from './frame-store'
import { GATE_COUNT, SEQ_FRAMES, frameUrl, loadOrder, pickTier, type Tier } from './frames'

const FETCH_CONCURRENCY = 8

type State = {
  progress: number
  ready: boolean
  complete: boolean
  failed: boolean
}

/**
 * Fetches the sequence as compressed blobs and hands back a store the render
 * loop can read synchronously. Decoding is the store's business — see
 * `frame-store.ts` for why it is windowed rather than eager.
 */
export function useFrameLoader(enabled: boolean) {
  const [state, setState] = useState<State>({
    progress: 0,
    ready: false,
    complete: false,
    failed: false,
  })

  const internalsRef = useRef<FrameStoreInternals | null>(null)
  if (!internalsRef.current) internalsRef.current = createFrameStore(SEQ_FRAMES)

  const tierRef = useRef<Tier>('half')

  useEffect(() => {
    if (!enabled) return
    const internals = internalsRef.current!

    const tier = pickTier()
    tierRef.current = tier

    let cancelled = false
    const order = loadOrder(SEQ_FRAMES)
    let loaded = 0
    let failures = 0
    let cursor = 0
    let sized = false

    const bump = () => {
      if (cancelled) return
      const progress = (loaded + failures) / SEQ_FRAMES
      const ready = loaded >= Math.min(GATE_COUNT, SEQ_FRAMES)
      const complete = loaded + failures >= SEQ_FRAMES
      setState((prev) =>
        // Avoid a re-render per frame once revealed; only meaningful jumps.
        !prev.ready || complete || Math.abs(progress - prev.progress) > 0.02
          ? {
              progress,
              ready: ready || prev.ready,
              complete,
              failed: failures > SEQ_FRAMES / 2,
            }
          : prev
      )
    }

    async function one(index: number) {
      try {
        const res = await fetch(frameUrl(index, tier))
        if (!res.ok) throw new Error(String(res.status))
        const blob = await res.blob()
        if (cancelled) return
        internals.put(index, blob)

        // Size the residency window from the first frame that lands, so it
        // reflects the tier actually served rather than an assumption.
        if (!sized) {
          sized = true
          try {
            const probe = await createImageBitmap(blob)
            internals.size(probe.width, probe.height)
            probe.close()
          } catch {
            internals.size(1920, 1080)
          }
        }

        loaded++
      } catch {
        failures++
      }
      bump()
    }

    async function worker() {
      while (!cancelled && cursor < order.length) {
        await one(order[cursor++])
      }
    }

    Promise.all(Array.from({ length: FETCH_CONCURRENCY }, worker))

    return () => {
      cancelled = true
      internals.dispose()
    }
  }, [enabled])

  return {
    ...state,
    store: internalsRef.current.store as FrameStore,
    tier: tierRef.current,
  }
}
