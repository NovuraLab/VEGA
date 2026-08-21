export default function Footer() {
  return (
    <footer id="reserve" className="relative bg-void px-6 pb-12 pt-28 md:px-10 md:pt-44">
      <div className="mx-auto max-w-[100rem]">
        <p className="mb-10 flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.34em] text-champagne">
          <span aria-hidden="true" className="block h-px w-12 bg-champagne/50" />
          Ownership
        </p>

        <h2 className="max-w-[18ch] text-[11vw] font-extralight leading-[0.9] tracking-tightest text-bone sm:text-[9vw] lg:text-[7vw]">
          Forty-eight
          <br />
          <span className="font-display font-light italic text-champagne">will exist.</span>
        </h2>

        <div className="mt-16 flex flex-col gap-10 border-t rule pt-10 md:flex-row md:items-end md:justify-between">
          <p className="max-w-[40ch] text-sm leading-relaxed text-bone/70">
            Registration of interest closes when the allocation is filled. A
            specification consultation in Modena follows for every confirmed
            commission.
          </p>

          <a
            href="mailto:allocation@vega.example"
            className="group inline-flex items-center gap-5 self-start border border-champagne/40 px-9 py-4 text-[10px] uppercase tracking-[0.26em] text-champagne transition-colors duration-500 ease-editorial hover:bg-champagne hover:text-ink md:self-auto"
          >
            Request allocation
            <span
              aria-hidden="true"
              className="inline-block transition-transform duration-500 ease-editorial group-hover:translate-x-1.5"
            >
              &rarr;
            </span>
          </a>
        </div>

        <div className="mt-24 flex flex-col-reverse gap-6 border-t rule pt-8 text-[10px] uppercase tracking-[0.22em] text-bone/55 md:flex-row md:items-center md:justify-between">
          <p>&copy; MMXXVI Vega Automobili · A fictional marque</p>
          <ul className="flex gap-8">
            {['Legal', 'Privacy', 'Press'].map((l) => (
              <li key={l}>
                <a
                  href="#reserve"
                  className="underline-grow pb-1 transition-colors duration-300 hover:text-bone/75"
                >
                  {l}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  )
}
