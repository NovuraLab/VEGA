export default function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      {/* Content scrolls under the nav, so it needs its own ground. A gradient
          scrim keeps the wordmark legible over both the page and the sequence
          without a scroll listener or a hard bar. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-void via-void/75 to-transparent"
      />
      <nav
        aria-label="Primary"
        className="relative mx-auto flex max-w-[100rem] items-center justify-between px-6 py-7 md:px-10"
      >
        <a href="#top" className="group flex items-baseline gap-3">
          <span className="text-[13px] font-light tracking-[0.5em] text-bone">VEGA</span>
          <span className="font-mono text-[9px] tracking-[0.2em] text-champagne/80">01</span>
        </a>

        <ul className="hidden items-center gap-10 md:flex">
          {[
            ['Engineering', '#sequence-heading'],
            ['Detail', '#detail'],
            ['Specification', '#specification'],
          ].map(([label, href]) => (
            <li key={label}>
              <a
                href={href}
                className="underline-grow pb-1 text-[11px] uppercase tracking-[0.22em] text-bone/65 transition-colors duration-300 hover:text-bone"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>

        <a
          href="#reserve"
          className="border border-champagne/30 px-6 py-2.5 text-[10px] uppercase tracking-[0.24em] text-champagne transition-colors duration-500 hover:border-champagne hover:bg-champagne hover:text-ink"
        >
          Enquire
        </a>
      </nav>
    </header>
  )
}
