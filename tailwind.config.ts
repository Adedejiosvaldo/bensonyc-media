import type { Config } from 'tailwindcss';

const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './content/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        plum: { 950: v('plum-950'), 900: v('plum-900'), 700: v('plum-700'), 100: v('plum-100') },
        magenta: v('magenta'),
        gold: v('gold'),
        surface: v('surface'),
        card: v('card'),
        ink: v('ink'),
        muted: v('muted'),
        line: v('line'),
        good: v('good'),
        warn: v('warn'),
      },
      fontFamily: {
        display: ['var(--font-display)', 'Impact', 'sans-serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: { xl2: '20px' },
      boxShadow: { lift: '0 1px 2px rgb(43 10 44 / 0.06), 0 8px 24px -12px rgb(43 10 44 / 0.18)' },
    },
  },
  plugins: [],
};
export default config;
