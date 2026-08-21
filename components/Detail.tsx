import { frameUrl } from '@/lib/frames'

/**
 * Deliberate close crops taken from the tail of the sequence (frames 140–192).
 * Those frames are too tight to *end* the scroll on — the car reads as cut off
 * rather than composed — but they hold plenty of resolution for real detail, so
 * they earn their keep here instead of being discarded.
 *
 * `nx`/`ny` are the normalised point in the frame to centre on and `zoom` is
 * how many container widths the image is scaled to. Dropping the whole 16:9
 * frame into a narrow column would just show the entire car three times over;
 * these are actual crops of actual parts.
 */
type Detail = {
  frame: number
  nx: number
  ny: number
  zoom: number
  caption: string
  note: string
  alt: string
}

// Crops zoom 2.4-2.8x, so they read from the native 1920 tier, not a downscale.

const DETAILS: Detail[] = [
  {
    frame: 165,
    nx: 0.76,
    ny: 0.7,
    zoom: 2.4,
    caption: 'Forged face',
    note: 'Turned from solid billet, then skimmed to 9.4 kg. Twenty hours a wheel.',
    alt: 'Close crop of the VEGA 01 forged monoblock wheel.',
  },
  {
    frame: 192,
    nx: 0.7,
    ny: 0.51,
    zoom: 2.8,
    caption: 'Lamp graphic',
    note: 'Seventeen LEDs behind one lens, aligned by hand to a 0.2 mm tolerance.',
    alt: 'Close crop of the VEGA 01 headlamp.',
  },
  {
    frame: 192,
    nx: 0.36,
    ny: 0.86,
    zoom: 2.6,
    caption: 'Splitter edge',
    note: 'Exposed 2×2 twill, laid so the weave runs true across the centreline.',
    alt: 'Close crop of the VEGA 01 front splitter.',
  },
]

/**
 * Container is 4:5. With a 16:9 source the image is `zoom × 100%` wide and
 * `zoom × 45%` tall, so offsets that centre (nx, ny) fall out directly — and
 * `zoom ≥ 2.23` guarantees the crop window never runs off the image.
 */
function cropStyle({ nx, ny, zoom }: Detail) {
  return {
    width: `${zoom * 100}%`,
    height: 'auto',
    left: `${50 - nx * zoom * 100}%`,
    top: `${50 - ny * zoom * 45}%`,
  }
}

export default function Detail() {
  return (
    <section id="detail" className="bg-void px-6 py-28 md:px-10 md:py-40">
      <div className="mx-auto max-w-[100rem]">
        <div className="flex flex-col gap-8 border-b rule pb-10 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-6 flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.34em] text-champagne">
              <span aria-hidden="true" className="block h-px w-12 bg-champagne/50" />
              Craft
            </p>
            <h2 className="max-w-[24ch] text-4xl font-extralight leading-[1.05] tracking-tightest text-bone lg:text-6xl">
              The parts you are not
              <br />
              <span className="font-display font-light italic text-champagne">
                meant to notice.
              </span>
            </h2>
          </div>
          <p className="max-w-[34ch] text-sm leading-relaxed text-bone/65">
            Every surface on the VEGA 01 is finished as though it were the one
            being looked at. Most of them never are.
          </p>
        </div>

        <ul className="mt-16 grid gap-x-10 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
          {DETAILS.map((d, i) => (
            <li key={d.caption} className="group">
              <div className="relative aspect-[4/5] overflow-hidden bg-ink">
                {/* Positioned crop rather than next/image: the point is the
                    part, not the frame it came from. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={frameUrl(d.frame - 1, 'xl')}
                  alt={d.alt}
                  loading="lazy"
                  decoding="async"
                  style={cropStyle(d)}
                  className="absolute max-w-none transition-transform duration-[1.6s] ease-editorial group-hover:scale-[1.06]"
                />
                {/* Grounds the crop in the same darkness as the sequence. */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-void/70 via-transparent to-void/20"
                />
              </div>

              <div className="mt-6 flex items-baseline gap-4 border-t rule pt-5">
                <span className="font-mono text-[10px] tracking-[0.2em] text-champagne/80">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="text-lg font-light tracking-tight text-bone">{d.caption}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-bone/65">{d.note}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
