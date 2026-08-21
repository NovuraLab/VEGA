/**
 * Narrative beats mapped onto the sequence's own timeline.
 *
 * The source frames run: fully exploded (1) -> chassis and monocoque with
 * panels closing in (~45) -> complete car (~96) -> camera dolly to a tight
 * front-quarter hero (192). The copy is written to land on those moments, so
 * `from`/`to` are deliberate, not evenly spaced.
 */
export type Beat = {
  id: string
  eyebrow: string
  title: string
  body: string
  from: number
  to: number
  side: 'left' | 'right' | 'center'
}

export const BEATS: Beat[] = [
  {
    id: 'components',
    eyebrow: 'Exploded view',
    title: '1,847 components',
    body: 'Every part machined, weighed and accounted for. Nothing is carried that does not earn its mass.',
    from: -0.06,
    to: 0.19,
    side: 'left',
  },
  {
    id: 'monocoque',
    eyebrow: 'Structure',
    title: 'One-piece tub',
    body: 'A carbon monocoque of 68 kilograms holding 1,180 Nm per degree of torsional rigidity.',
    from: 0.21,
    to: 0.42,
    side: 'right',
  },
  {
    id: 'drive',
    eyebrow: 'Powertrain',
    title: 'Twin-axis drive',
    body: 'Two motors. 1,020 horsepower. Torque vectored across the axle one hundred times a second.',
    from: 0.44,
    to: 0.63,
    side: 'left',
  },
  {
    id: 'assembled',
    eyebrow: 'Assembly',
    title: 'Six hundred hours',
    body: 'Bonded, torqued and measured by hand in Modena. Then measured again.',
    from: 0.66,
    to: 0.85,
    side: 'right',
  },
  {
    id: 'whole',
    eyebrow: 'VEGA 01',
    title: 'One machine',
    body: 'Delivery from spring 2027. Forty-eight cars, then the tooling is destroyed.',
    from: 0.88,
    to: 1.0,
    side: 'center',
  },
]

