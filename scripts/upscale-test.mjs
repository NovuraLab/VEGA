/**
 * Is the softness the browser's upscale, and would pre-upscaling fix it?
 *
 * The source is 1280x720. On a 1920 viewport the canvas must draw it 1.5x up,
 * and on 2560 it is 2x. No code creates detail that is not in the source, but
 * *how* the stretch is done matters: a Lanczos resample with a mild unsharp
 * mask looks materially crisper than the bilinear filter a canvas uses.
 *
 * Measured at a common size so the numbers are comparable, and normalised
 * against a deliberately blurred copy so the score reflects crispness rather
 * than how much detail the frame happens to contain.
 */
import sharp from 'sharp'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = path.resolve(fileURLToPath(import.meta.url), '../../../frames')
const FRAME = Number(process.argv[2] ?? 60)
const TARGET = Number(process.argv[3] ?? 1920)
const file = path.join(SRC, `frame_${String(FRAME).padStart(4, '0')}.jpg`)

async function lap(buf) {
  const { data, info } = await sharp(buf)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const { width: w, height: h } = info
  let sum = 0
  let n = 0
  for (let y = 1; y < h - 1; y += 2) {
    for (let x = 1; x < w - 1; x += 2) {
      const i = y * w + x
      sum += Math.abs(4 * data[i] - data[i - 1] - data[i + 1] - data[i - w] - data[i + w])
      n++
    }
  }
  return sum / n
}

/** Crispness normalised by content: how much does another blur change it? */
async function crispness(buf) {
  const a = await lap(buf)
  const blurred = await sharp(buf).blur(1.1).toBuffer()
  const b = await lap(blurred)
  return { lap: a, ratio: a / b }
}

const variants = {
  'source 1280 (native)': await sharp(file).toBuffer(),
  [`bilinear -> ${TARGET} (what canvas does)`]: await sharp(file)
    .resize({ width: TARGET, kernel: 'nearest' })
    .blur(0.62) // approximates a bilinear stretch
    .toBuffer(),
  [`lanczos3 -> ${TARGET}`]: await sharp(file)
    .resize({ width: TARGET, kernel: 'lanczos3' })
    .toBuffer(),
  [`lanczos3 + unsharp -> ${TARGET}`]: await sharp(file)
    .resize({ width: TARGET, kernel: 'lanczos3' })
    .sharpen({ sigma: 0.8, m1: 0.5, m2: 0.9 })
    .toBuffer(),
  [`source + unsharp, still 1280`]: await sharp(file)
    .sharpen({ sigma: 0.7, m1: 0.4, m2: 0.8 })
    .toBuffer(),
}

console.log(`frame ${FRAME}, target ${TARGET}px\n`)
console.log('variant                                  |Laplacian|   crispness   webp KB')
for (const [name, buf] of Object.entries(variants)) {
  const c = await crispness(buf)
  const webp = await sharp(buf).webp({ quality: 80, effort: 5, smartSubsample: true }).toBuffer()
  console.log(
    name.padEnd(40),
    c.lap.toFixed(2).padStart(9),
    c.ratio.toFixed(3).padStart(12),
    (webp.length / 1024).toFixed(1).padStart(9)
  )
}
