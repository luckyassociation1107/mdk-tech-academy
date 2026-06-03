/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        academy: {
          navy: '#071429',
          ink: '#0B1730',
          slate: '#475569',
          pearl: '#F8FAFC',
          line: '#D9E2EC',
          gold: '#C8A45D',
          cyan: '#79D8FF',
        },
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      boxShadow: {
        institutional: '0 24px 80px rgba(7, 20, 41, 0.18)',
        glow: '0 0 60px rgba(121, 216, 255, 0.55)',
      },
    },
  },
  plugins: [],
};
