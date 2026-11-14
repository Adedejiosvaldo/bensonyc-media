import type { Config } from 'tailwindcss';

const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './content/**/*.{ts,tsx}'],
  // The app is always light: `dark:` variants only apply under a .dark class, which nothing sets.
  darkMode: 'class',
  // Hover styles only apply on devices that can hover, so a tap never leaves a stuck hover state.
  future: { hoverOnlyWhenSupported: true },
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
        accent: v('accent'),
        danger: v('danger'),
        'good-ink': v('good-ink'),
        'warn-ink': v('warn-ink'),
      },
      fontFamily: {
        display: ['var(--font-display)', 'Impact', 'sans-serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: { xl2: '20px' },
      // Cards sit on the surface with a hairline border and a soft shadow; hover lifts use `raise`.
      boxShadow: {
        lift: '0 1px 2px rgb(43 10 44 / 0.05), 0 6px 18px -12px rgb(43 10 44 / 0.14)',
        raise: '0 2px 4px rgb(43 10 44 / 0.06), 0 14px 30px -14px rgb(43 10 44 / 0.22)',
      },
    },
  },
  plugins: [],
};
export default config;
