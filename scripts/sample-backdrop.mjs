/**
 * Eyedropper for the studio backdrop grey.
 *
 * `sample-bg.mjs` reads the extreme edge strips, which is the right question
 * for "where does the canvas meet the page". This asks a different one: what
 * grey does the backdrop actually *read* as, so the page can sit on it.
 *
 * The car is strongly saturated crimson and the chassis is bright metal, so
 * pixels are filtered to low-saturation, mid-dark values before taking
 * percentiles. Reported per frame because the backdrop brightens as the camera
 * pushes in.
 */
import sharp from 'sharp'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = process.argv[2] ?? path.resolve(fileURLToPath(import.meta.url), '../../../newFrames')
const PREFIX = process.argv[3] ?? 'newFrames_'
 const FRAMES = [1, 12, 30, 55, 80, 96, 110, 124]

const hex = (r, g, b) =>
  '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')

/** Rec. 709 luma — close enough to perceived lightness for ranking greys. */
const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b

async function analyse(frame) {
  const file = path.join(SRC, PREFIX + String(frame).padStart(4, '0') + '.jpg')
  const img = sharp(file).removeAlpha().toColourspace('srgb')
  const { width, height } = await img.metadata()

  // Downscale first: we want the backdrop's broad tone, not JPEG noise.
  const W = 240
  const H = Math.round((W * height) / width)
  const { data } = await img.resize(W, H).raw().toBuffer({ resolveWithObject: true })

  const all = []
  const border = []

  for (let i = 0; i < data.length; i += 3) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const px = i / 3
    const x = px % W
    const y = Math.floor(px / W)

    const sat = Math.max(r, g, b) - Math.min(r, g, b)
    const l = luma(r, g, b)

    // Backdrop is desaturated and mid-dark. This drops the crimson panels and
    // the specular metal, which would otherwise drag the average around.
    const isBackdropish = sat <= 14 && l >= 8 && l <= 90
    if (!isBackdropish) continue

    all.push([r, g, b, l])

    const inBorder = x < W * 0.1 || x > W * 0.9 || y < H * 0.12 || y > H * 0.88
    if (inBorder) border.push([r, g, b, l])
  }

  const pick = (arr, p) => {
    if (!arr.length) return null
    const s = arr.slice().sort((a, c) => a[3] - c[3])
    return s[Math.min(s.length - 1, Math.floor(p * s.length))]
  }

  const mean = (arr) => {
    if (!arr.length) return null
    const t = arr.reduce((a, c) => [a[0] + c[0], a[1] + c[1], a[2] + c[2]], [0, 0, 0])
    return t.map((v) => v / arr.length)
  }

  return {
    frame,
    kept: all.length,
    p25: pick(all, 0.25),
    median: pick(all, 0.5),
    p75: pick(all, 0.75),
    mean: mean(all),
    borderMedian: pick(border, 0.5),
  }
}

const rows = []
for (const f of FRAMES) rows.push(await analyse(f))

console.log('backdrop grey per frame (low-saturation pixels only)\n')
console.log('frame   p25      median   p75      mean     border-median')
for (const r of rows) {
  console.log(
    String(r.frame).padStart(5),
    '  ' + hex(...r.p25.slice(0, 3)),
    '  ' + hex(...r.median.slice(0, 3)),
    '  ' + hex(...r.p75.slice(0, 3)),
    '  ' + hex(...r.mean),
    '  ' + hex(...r.borderMedian.slice(0, 3))
  )
}

const avgOf = (key) => {
  const t = rows.reduce(
    (a, r) => {
      const v = key === 'mean' ? r[key] : r[key].slice(0, 3)
      return [a[0] + v[0], a[1] + v[1], a[2] + v[2]]
    },
    [0, 0, 0]
  )
  return t.map((v) => v / rows.length)
}

console.log('\nacross all sampled frames:')
console.log('  median of backdrop   ', hex(...avgOf('median')))
console.log('  mean of backdrop     ', hex(...avgOf('mean')))
console.log('  border median        ', hex(...avgOf('borderMedian')))
console.log('  darker quartile (p25)', hex(...avgOf('p25')))
