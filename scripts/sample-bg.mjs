/**
 * Eyedropper: samples the true background colour of the frame sequence.
 *
 * The page background must match the sequence background EXACTLY, otherwise the
 * letterboxed canvas edges become visible. We sample the extreme corners (which
 * are pure backdrop in every frame) plus the mid-edges, across frames spanning
 * the whole sequence, and report both the modal and mean value.
 */
import sharp from 'sharp'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = process.argv[2] ?? path.resolve(fileURLToPath(import.meta.url), '../../../frames')
const FRAMES = [1, 24, 45, 72, 96, 120, 140, 165, 192]

const hex = (r, g, b) =>
  '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')

/** Average a small patch so JPEG noise / chroma subsampling doesn't skew the read. */
async function patch(img, meta, left, top, size = 8) {
  const { data } = await img
    .clone()
    .extract({
      left: Math.max(0, Math.min(left, meta.width - size)),
      top: Math.max(0, Math.min(top, meta.height - size)),
      width: size,
      height: size,
    })
    .raw()
    .toBuffer({ resolveWithObject: true })

  let r = 0, g = 0, b = 0
  const px = data.length / 3
  for (let i = 0; i < data.length; i += 3) {
    r += data[i]; g += data[i + 1]; b += data[i + 2]
  }
  return [r / px, g / px, b / px]
}

const tally = new Map()
const all = []

for (const n of FRAMES) {
  const file = path.join(SRC, `frame_${String(n).padStart(4, '0')}.jpg`)
  const img = sharp(file).removeAlpha().toColourspace('srgb')
  const meta = await img.metadata()

  const spots = {
    'top-left': [2, 2],
    'top-right': [meta.width - 10, 2],
    'bottom-left': [2, meta.height - 10],
    'bottom-right': [meta.width - 10, meta.height - 10],
    'top-mid': [Math.round(meta.width / 2) - 4, 2],
  }

  const reads = []
  for (const [name, [x, y]] of Object.entries(spots)) {
    const rgb = await patch(img, meta, x, y)
    reads.push(`${name}=${hex(...rgb)}`)
    all.push(rgb)
    const key = hex(...rgb)
    tally.set(key, (tally.get(key) ?? 0) + 1)
  }
  console.log(`frame ${String(n).padStart(3)} (${meta.width}x${meta.height})  ${reads.join('  ')}`)
}

const mean = all.reduce((a, c) => [a[0] + c[0], a[1] + c[1], a[2] + c[2]], [0, 0, 0]).map((v) => v / all.length)
const corners = all.filter((_, i) => i % 5 !== 4) // exclude top-mid (can catch vignette)
const cornerMean = corners.reduce((a, c) => [a[0] + c[0], a[1] + c[1], a[2] + c[2]], [0, 0, 0]).map((v) => v / corners.length)

const darkest = all.reduce((a, c) => (c[0] + c[1] + c[2] < a[0] + a[1] + a[2] ? c : a))
console.log('\n' + '-'.repeat(60))
console.log('mean (all spots)   ', hex(...mean), mean.map((v) => v.toFixed(2)).join(', '))
console.log('mean (corners only)', hex(...cornerMean), cornerMean.map((v) => v.toFixed(2)).join(', '))
console.log('darkest patch      ', hex(...darkest))
console.log('\nmost frequent patch values:')
;[...tally.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 6)
  .forEach(([k, v]) => console.log(`  ${k}  x${v}`))
console.log('\n=> use for page background:', hex(...cornerMean))
