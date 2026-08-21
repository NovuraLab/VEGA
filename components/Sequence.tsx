'use client'

import { useState } from 'react'
import SequenceCanvas from './SequenceCanvas'
import SequenceFallback from './SequenceFallback'

/**
 * The scroll-linked sequence is the page, so everyone gets it by default —
 * including visitors with `prefers-reduced-motion`.
 *
 * That flag is deliberately *not* used to withhold the sequence. Scrubbing here
 * is animation from interaction: frames only advance because the visitor
 * scrolls, the same category as scrolling any image into view. On Windows the
 * flag is also set simply by turning off "Animation effects", which people do
 * for performance with no intent to disable content. What reduced motion does
 * suppress is the autonomous part — the parallax drift and the easing lag —
 * handled inside SequenceCanvas.
 *
 * WCAG 2.3.3 still wants interaction-triggered motion to be switchable off, so
 * the sequence offers a one-click static view rather than deciding for you.
 * Rendering the sequence on the server as well keeps hydration honest and
 * avoids a document-height jump on mount.
 */
export default function Sequence() {
  const [staticView, setStaticView] = useState(false)

  if (staticView) return <SequenceFallback onPlay={() => setStaticView(false)} />
  return <SequenceCanvas onStaticView={() => setStaticView(true)} />
}
