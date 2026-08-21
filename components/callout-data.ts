/**
 * Annotated hotspots that track parts of the car as the sequence scrubs.
 *
 * `x`/`y` are normalised *image* coordinates (0–1), not viewport coordinates.
 * The canvas is sized to the source 16:9, so the image box and the canvas box
 * are the same rectangle and these map straight onto it at any breakpoint.
 *
 * Anchors were read off the actual frames — 12 for the exploded group, 55 for
 * the chassis group, 113 for the finished car — so each dot lands on the part
 * it names. Windows are kept short (~12 frames) because the camera dollies
 * throughout; a fixed anchor held for longer would visibly drift off its part.
 *
 * `side` is the direction the leader line runs, chosen per callout so labels
 * never collide with each other or with the beat copy.
 */
export type Callout = {
  id: string
  label: string
  value: string
  /** Normalised image coordinates of the part. */
  x: number
  y: number
  from: number
  to: number
  side: 'left' | 'right'
}

export const CALLOUTS: Callout[] = [
  // Exploded — anchored on frame 12
  {
    id: 'clamshell',
    label: 'Aluminium clamshell',
    value: 'One piece · 14 kg',
    x: 0.29,
    y: 0.21,
    from: 0.025,
    to: 0.185,
    side: 'left',
  },
  {
    id: 'wing',
    label: 'Active rear wing',
    value: '412 kg at 250 km/h',
    x: 0.83,
    y: 0.13,
    from: 0.04,
    to: 0.195,
    side: 'left',
  },
  {
    id: 'pack',
    label: 'Module array',
    value: '92 kWh · floor mounted',
    x: 0.55,
    y: 0.82,
    from: 0.05,
    to: 0.205,
    side: 'right',
  },

  // Chassis — anchored on frame 55
  {
    id: 'drive',
    label: 'Front drive unit',
    value: '510 hp · oil cooled',
    x: 0.32,
    y: 0.56,
    from: 0.37,
    to: 0.53,
    side: 'left',
  },
  {
    id: 'tub',
    label: 'Carbon monocoque',
    value: '68 kg · autoclave cured',
    x: 0.55,
    y: 0.38,
    from: 0.385,
    to: 0.545,
    side: 'right',
  },
  {
    id: 'damper',
    label: 'Pushrod damper',
    value: 'Inboard · rear axle',
    x: 0.75,
    y: 0.47,
    from: 0.405,
    to: 0.565,
    side: 'right',
  },

  // Finished car — anchored on frame 113
  {
    id: 'wheel',
    label: 'Forged monoblock',
    value: '21 inch · 9.4 kg',
    x: 0.52,
    y: 0.72,
    from: 0.845,
    to: 0.995,
    side: 'left',
  },
  {
    id: 'sill',
    label: 'Carbon side sill',
    value: 'Underbody channel',
    x: 0.68,
    y: 0.78,
    from: 0.862,
    to: 1,
    side: 'right',
  },
]
