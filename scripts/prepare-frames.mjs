/**
 * Frame pipeline.
 *
 * Transcodes the source frames to WebP at three widths and writes the manifest
 * the client reads. Run it whenever the source set changes.
 *
 * The source directory and filename prefix are discovered rather than
 * hardcoded, so dropping a new render set in (different resolution, different
 * naming) needs no edits here: point SRC at it and the tiers follow.
 *
 * Tier widths exist so no display has to upscale further than it must. The
 * source is 1920x1080, so a 1920 viewport draws 1:1 — which is the actual cure
 * for the blur, not sharpening. The 1280 and 640 tiers are proper Lanczos
 * downscales of that same detail, so they are sharper than an equivalent tier
 * built from a 1280 source would be.
 */
import sharp from 'sharp'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../..')
const SRC = path.resolve(ROOT, '../newFrames')

/**
 * Only the downscaled tiers get an unsharp mask, and a light one: Lanczos
 * softens slightly on the way down, so this restores the edge and nothing more.
 * The native tier gets none — the source is already sharp, and a mask on top of
 * an upscaled render produces halos around the body panels.
 */
const TIERS = [
  { name: 'xl', width: 1920, quality: 78, dir: 'public/frames/xl', sharpen: null },
  {
    name: 'full',
    width: 1280,
    quality: 80,
    dir: 'public/frames/full',
    sharpen: { sigma: 0.6, m1: 0.3, m2: 0.8 },
  },
  {
    name: 'half',
    width: 640,
    quality: 76,
    dir: 'public/frames/half',
    sharpen: { sigma: 0.6, m1: 0.35, m2: 0.85 },
  },
]

const STRIP = 6 // px depth of the edge strip we average

const hex = (r, g, b) =>
  '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')

function meanOf(data) {
  let r = 0, g = 0, b = 0
  const px = data.length / 3
  for (let i = 0; i < data.length; i += 3) {
    r += data[i]; g += data[i + 1]; b += data[i + 2]
  }
  return [r / px, g / px, b / px]
}

async function stripColour(img, box) {
  const { data } = await img.clone().extract(box).raw().toBuffer({ resolveWithObject: true })
  return hex(...meanOf(data))
}

/** Diagnostic only — reported, never shipped. */
async function edges(file) {
  const img = sharp(file).removeAlpha().toColourspace('srgb')
  const { width: w, height: h } = await img.metadata()
  const [t, b, l, r] = await Promise.all([
    stripColour(img, { left: 0, top: 0, width: w, height: STRIP }),
    stripColour(img, { left: 0, top: h - STRIP, width: w, height: STRIP }),
    stripColour(img, { left: 0, top: 0, width: STRIP, height: h }),
    stripColour(img, { left: w - STRIP, top: 0, width: STRIP, height: h }),
  ])
  return { t, b, l, r, w, h }
}

async function run() {
  const all = await fs.readdir(SRC)
  const jpgs = all.filter((f) => /\.jpe?g$/i.test(f)).sort()
  if (!jpgs.length) throw new Error(`No frames found in ${SRC}`)

  // Discover the prefix from the first file, so any naming works.
  const m = /^(.*?)(\d+)\.jpe?g$/i.exec(jpgs[0])
  if (!m) throw new Error(`Cannot parse a frame number out of ${jpgs[0]}`)
  const prefix = m[1]
  console.log(`Source ${SRC}\n  ${jpgs.length} frames, prefix "${prefix}"`)

  for (const tier of TIERS) {
    await fs.rm(path.join(ROOT, tier.dir), { recursive: true, force: true })
    await fs.mkdir(path.join(ROOT, tier.dir), { recursive: true })
  }

  let width = 0
  let height = 0
  const sizeIn = new Array(jpgs.length).fill(0)
  const sizeOut = Object.fromEntries(TIERS.map((t) => [t.name, new Array(jpgs.length).fill(0)]))
  let firstEdges = null
  let lastEdges = null

  const POOL = 8
  let cursor = 0

  async function worker() {
    while (cursor < jpgs.length) {
      const i = cursor++
      const src = path.join(SRC, jpgs[i])
      // Output is renumbered to frame_NNNN so the client URL scheme is stable
      // regardless of what the source set was called.
      const out = `frame_${String(i + 1).padStart(4, '0')}.webp`

      sizeIn[i] = (await fs.stat(src)).size
      if (i === 0 || i === jpgs.length - 1) {
        const e = await edges(src)
        if (i === 0) { firstEdges = e; width ||= e.w; height ||= e.h }
        else lastEdges = e
      }

      for (const tier of TIERS) {
        let pipe = sharp(src).resize({
          width: tier.width,
          withoutEnlargement: true,
          kernel: 'lanczos3',
        })
        if (tier.sharpen) pipe = pipe.sharpen(tier.sharpen)
        const dest = path.join(ROOT, tier.dir, out)
        await pipe
          .webp({ quality: tier.quality, effort: 5, smartSubsample: true })
          .toFile(dest)
        sizeOut[tier.name][i] = (await fs.stat(dest)).size
      }

      if ((i + 1) % 24 === 0) process.stdout.write(`  ${i + 1}/${jpgs.length}\n`)
    }
  }

  await Promise.all(Array.from({ length: POOL }, worker))

  if (!width) {
    const meta = await sharp(path.join(SRC, jpgs[0])).metadata()
    width = meta.width
    height = meta.height
  }

  // Poster: first paint, reduced-motion still, and the OG image.
  await sharp(path.join(SRC, jpgs[jpgs.length - 1]))
    .resize({ width: 1600, withoutEnlargement: true, kernel: 'lanczos3' })
    .sharpen({ sigma: 0.6, m1: 0.3, m2: 0.8 })
    .webp({ quality: 84 })
    .toFile(path.join(ROOT, 'public/frames/poster.webp'))

  await fs.writeFile(
    path.join(ROOT, 'lib/frame-manifest.json'),
    JSON.stringify({ count: jpgs.length, width, height }, null, 2) + '\n'
  )

  const total = (a) => a.reduce((x, y) => x + y, 0)
  const mb = (n) => (n / 1024 / 1024).toFixed(2) + 'MB'
  const bytesIn = total(sizeIn)
  console.log(`\nsource            ${mb(bytesIn)}   (${width}x${height})`)
  for (const t of TIERS) {
    const out = total(sizeOut[t.name])
    const avg = (out / jpgs.length / 1024).toFixed(1)
    console.log(
      `${t.name.padEnd(6)} (${String(t.width).padStart(4)}w)  ${mb(out).padStart(8)}  ${avg}KB/frame`
    )
  }
  console.log(`\nmanifest -> lib/frame-manifest.json (${jpgs.length} frames, ${width}x${height})`)
  if (firstEdges) console.log('edge sample first:', JSON.stringify({ t: firstEdges.t, b: firstEdges.b }))
  if (lastEdges) console.log('edge sample last: ', JSON.stringify({ t: lastEdges.t, b: lastEdges.b }))
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
