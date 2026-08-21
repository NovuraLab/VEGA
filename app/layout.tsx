import type { Metadata, Viewport } from 'next'
import { Cormorant_Garamond, Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

/**
 * A light serif, used only for large numerals and the closing statement. Held
 * to those two jobs it reads as a marque; used everywhere it would read as a
 * wedding invitation.
 */
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400'],
  display: 'swap',
  variable: '--font-cormorant',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: 'VEGA 01 — Built once, then never again',
  description:
    'The VEGA 01 is assembled from 1,847 parts, each designed for a single car. An exploded-view scrollytelling study of a 1,020 hp carbon-monocoque coupe.',
  openGraph: {
    title: 'VEGA 01 — Built once, then never again',
    description: 'An exploded-view study of a 1,020 hp carbon-monocoque coupe.',
    images: ['/frames/poster.webp'],
    type: 'website',
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: '#1f1e22',
  colorScheme: 'dark',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${cormorant.variable}`}>
      <body className="bg-void font-sans">
        <a
          href="#sequence-heading"
          className="sr-only focus:not-sr-only focus:fixed focus:left-6 focus:top-6 focus:z-[100] focus:rounded-full focus:bg-bone focus:px-5 focus:py-3 focus:text-[11px] focus:uppercase focus:tracking-[0.2em] focus:text-void"
        >
          Skip to the sequence
        </a>
        {children}
        {/* Film grain. A flat black page reads as cheap; a little tooth across
            everything reads as printed. Fixed and pointer-events-none, so it
            never repaints on scroll. */}
        <div aria-hidden="true" className="grain" />
      </body>
    </html>
  )
}
