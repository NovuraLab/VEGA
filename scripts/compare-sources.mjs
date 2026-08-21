/**
 * Does the new frame set actually carry more detail, or is it a naive stretch?
 *
 * This matters before rebuilding anything: if the upscale merely interpolated,
 * it cannot fix the blur — it only makes the files bigger. The test compares
 * each new frame against the *old* frame resampled to the same size. Real added
 * detail shows as materially higher crispness at matched dimensions.
 */
import sharp from 'sharp'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../../..')
const OLD = path.join(ROOT, 'frames')
const NEW = path.join(ROOT, 'newFrames')
const FRAMES = [12, 55, 90, 113, 124]

async function lap(buf) {
  const { data, info } = await sharp(buf).greyscale().raw().toBuffer({ resolveWithObject: true })
  const { width: w, height: h } = info
  let s = 0
  let n = 0
  for (let y = 1; y < h - 1; y += 2) {
    for (let x = 1; x < w - 1; x += 2) {
      const i = y * w + x
      s += Math.abs(4 * data[i] - data[i - 1] - data[i + 1] - data[i - w] - data[i + w])
      n++
    }
  }
  return s / n
}

/** Crispness normalised by content, so it reflects blur not detail density. */
async function crisp(buf) {
  const a = await lap(buf)
  const b = await lap(await sharp(buf).blur(1.1).toBuffer())
  return a / b
}

const first = await sharp(path.join(NEW, 'newFrames_0001.jpg')).metadata()
const firstOld = await sharp(path.join(OLD, 'frame_0001.jpg')).metadata()
console.log(`old set: ${firstOld.width}x${firstOld.height}`)
console.log(`new set: ${first.width}x${first.height}`)
console.log(`scale:   ${(first.width / firstOld.width).toFixed(2)}x\n`)

console.log('frame   new (native)   old resampled to same size   verdict')
for (const f of FRAMES) {
  const n4 = String(f).padStart(4, '0')
  const newBuf = await sharp(path.join(NEW, `newFrames_${n4}.jpg`)).toBuffer()
  const oldUp = await sharp(path.join(OLD, `frame_${n4}.jpg`))
    .resize({ width: first.width, kernel: 'lanczos3' })
    .toBuffer()

  const cNew = await crisp(newBuf)
  const cOld = await crisp(oldUp)
  const gain = ((cNew / cOld) * 100 - 100).toFixed(1)
  const verdict =
    cNew / cOld > 1.15 ? 'REAL added detail' : cNew / cOld > 1.04 ? 'modest gain' : 'no real gain'

  console.log(
    String(f).padStart(5),
    cNew.toFixed(3).padStart(12),
    cOld.toFixed(3).padStart(26),
    `   ${gain > 0 ? '+' : ''}${gain}%  ${verdict}`
  )
}
