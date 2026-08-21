const SPECS: { label: string; value: string; unit?: string; note: string }[] = [
  {
    label: 'Architecture',
    value: '68',
    unit: 'kg tub',
    note: 'Carbon monocoque, bonded aluminium subframes front and rear.',
  },
  {
    label: 'Powertrain',
    value: '1,020',
    unit: 'hp',
    note: 'Twin-axis electric, 1,400 Nm, 92 kWh at 800 volts.',
  },
  {
    label: 'Acceleration',
    value: '2.4',
    unit: 's',
    note: '0—100 km/h with both axles driven and no launch ceremony.',
  },
  {
    label: 'Downforce',
    value: '412',
    unit: 'kg',
    note: 'At 250 km/h, generated without an active wing.',
  },
  {
    label: 'Brakes',
    value: '410',
    unit: 'mm',
    note: 'Carbon ceramic, six-piston monobloc calipers at the front.',
  },
  {
    label: 'Production',
    value: '48',
    unit: 'units',
    note: 'Tooling destroyed on completion of the final car.',
  },
]

export default function Specification() {
  return (
    <section id="specification" className="bg-void px-6 py-28 md:px-10 md:py-40">
      <div className="mx-auto max-w-[100rem]">
        <div className="flex items-end justify-between border-b rule pb-8">
          <p className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.34em] text-champagne">
            <span aria-hidden="true" className="block h-px w-12 bg-champagne/50" />
            Specification
          </p>
          <p className="font-mono text-[10px] tracking-[0.2em] text-bone/55">VEGA 01</p>
        </div>

        <dl>
          {SPECS.map((s, i) => (
            <div
              key={s.label}
              className="group grid grid-cols-1 items-baseline gap-y-4 border-b rule py-9 transition-colors duration-500 hover:border-champagne/40 md:grid-cols-12 md:gap-x-10"
            >
              <span className="font-mono text-[10px] tracking-[0.2em] text-champagne/80 md:col-span-1">
                {String(i + 1).padStart(2, '0')}
              </span>
              <dt className="font-mono text-[10px] uppercase tracking-[0.26em] text-bone/60 md:col-span-3">
                {s.label}
              </dt>
              <dd className="font-display text-4xl font-light leading-none text-bone md:col-span-3 lg:text-5xl">
                {s.value}
                {s.unit && (
                  <span className="ml-2 font-sans text-xs tracking-widest text-bone/55">
                    {s.unit}
                  </span>
                )}
              </dd>
              <dd className="text-sm leading-relaxed text-bone/65 md:col-span-5">{s.note}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
