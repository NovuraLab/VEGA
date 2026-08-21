import Image from 'next/image'
import { BEATS } from './beats'

/**
 * The static telling of the same story. Shown when the visitor asks for the
 * static view, or when the sequence itself failed to download. No canvas, no
 * pinned section, no 192-frame fetch.
 */
export default function SequenceFallback({ onPlay }: { onPlay?: () => void }) {
  return (
    <section aria-labelledby="sequence-heading" className="bg-void px-6 py-24 md:px-16 lg:px-24">
      <div className="mx-auto flex max-w-6xl items-baseline justify-between gap-6">
        <h2 id="sequence-heading" className="text-xs uppercase tracking-[0.32em] text-champagne">
          Engineering
        </h2>
        {onPlay && (
          <button
            type="button"
            onClick={onPlay}
            className="font-mono text-[10px] uppercase tracking-[0.24em] text-bone/55 transition-colors duration-300 hover:text-bone"
          >
            Play sequence
          </button>
        )}
      </div>

      <div className="relative mx-auto mt-10 max-w-6xl">
        <Image
          src="/frames/poster.webp"
          alt="The VEGA 01, a crimson mid-engined coupe, photographed in a dark studio."
          width={1600}
          height={900}
          className="feather-edges w-full"
        />
      </div>

      <ol className="mx-auto mt-20 grid max-w-6xl gap-x-12 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
        {BEATS.map((beat) => (
          <li key={beat.id}>
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.32em] text-champagne">
              {beat.eyebrow}
            </p>
            <h3 className="text-2xl font-light tracking-tightest text-bone lg:text-3xl">
              {beat.title}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-bone/70">{beat.body}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
