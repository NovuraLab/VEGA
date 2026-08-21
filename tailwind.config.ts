import type { Config } from 'tailwindcss'

/**
 * `void` is eyedropped from the frame sequence's backdrop (the top studio
 * falloff reads #0d0d0f–#101012 across the whole sequence). The page must sit
 * on this exact value or the canvas would announce its own edges.
 *
 * `bone` and `champagne` carry the luxury register: a warm off-white reads far
 * more expensive than pure #fff on black, and a single metallic accent does the
 * work that colour would otherwise have to.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#1F1E22',
        ink: '#08080A',
        bone: '#EDE7DB',
        champagne: '#C0A47A',
        ember: '#B81D2C',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'SF Pro Display', '-apple-system', 'system-ui', 'sans-serif'],
        display: ['var(--font-cormorant)', 'Cormorant Garamond', 'Georgia', 'serif'],
      },
      letterSpacing: {
        tightest: '-0.045em',
      },
      transitionTimingFunction: {
        editorial: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        rise: {
          from: { opacity: '0', transform: 'translateY(26px)' },
          to: { opacity: '1', transform: 'none' },
        },
        'rail-drift': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(400%)' },
        },
      },
      animation: {
        rise: 'rise 1.2s cubic-bezier(0.16,1,0.3,1) both',
        'rail-drift': 'rail-drift 2.6s cubic-bezier(0.65,0,0.35,1) infinite',
      },
    },
  },
  plugins: [],
}

export default config
