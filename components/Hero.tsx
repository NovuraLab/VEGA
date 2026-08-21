/**
 * Server component. The entrance reveal is pure CSS rather than Framer, for
 * two reasons: the copy stays visible if JavaScript never arrives (a JS-gated
 * `opacity: 0` would hide the headline outright), and the hero ships no client
 * bundle at all.
 */
const STATS: [string, string, string][] = [
  ['0—100 km/h', '2.4', 's'],
  ['Output', '1,020', 'hp'],
  ['Dry mass', '1,310', 'kg'],
  ['Allocation', '48', 'cars'],
]

export default function Hero() {
  return (
    <section
      id="top"
      className="relative flex min-h-screen flex-col justify-between overflow-hidden bg-void px-6 pb-10 pt-36 md:px-10"
    >
      <div className="mx-auto flex w-full max-w-[100rem] flex-1 flex-col justify-center">
        <p
          style={{ animationDelay: '0ms' }}
          className="mb-10 flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.42em] text-champagne motion-safe:animate-rise"
        >
          <span aria-hidden="true" className="block h-px w-12 bg-champagne/50" />
          Modena · MMXXVII
        </p>

        <h1
          style={{ animationDelay: '120ms' }}
          className="max-w-[15ch] text-[15vw] font-extralight leading-[0.88] tracking-tightest text-bone motion-safe:animate-rise sm:text-[12vw] lg:text-[9vw]"
        >
          Built once,
          <br />
          then never
          <br />
          <span className="font-display font-light italic text-champagne">again.</span>
        </h1>

        <p
          style={{ animationDelay: '240ms' }}
          className="mt-12 max-w-[44ch] text-base leading-relaxed text-bone/70 motion-safe:animate-rise lg:text-lg"
        >
          Assembled from 1,847 parts, each one designed for a single car and a
          single purpose. Scroll to take it apart.
        </p>
      </div>

      <div
        style={{ animationDelay: '360ms' }}
        className="mx-auto w-full max-w-[100rem] motion-safe:animate-rise"
      >
        <dl className="grid grid-cols-2 gap-y-8 border-t rule pt-8 md:grid-cols-4">
          {STATS.map(([label, value, unit]) => (
            <div key={label} className="md:border-l md:first:border-l-0 rule md:pl-8">
              <dt className="font-mono text-[10px] uppercase tracking-[0.24em] text-bone/55">
                {label}
              </dt>
              <dd className="mt-3 font-display text-4xl font-light leading-none text-bone lg:text-5xl">
                {value}
                <span className="ml-1.5 font-sans text-xs tracking-widest text-bone/55">
                  {unit}
                </span>
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-10 flex items-center gap-4">
          {/* A travelling rail rather than a bouncing chevron — quieter, and it
              reads as the same instrument as the sequence HUD. */}
          <span
            className="relative block h-12 w-px overflow-hidden bg-bone/25"
            aria-hidden="true"
          >
            <span className="absolute inset-x-0 top-0 block h-1/3 bg-champagne motion-safe:animate-rail-drift" />
          </span>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-bone/60">
            Scroll to explore
          </p>
        </div>
      </div>
    </section>
  )
}
