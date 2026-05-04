import type { Config } from 'tailwindcss'

// Nota: `electric` NO está aquí. Se define manualmente en globals.css con
// `rgb(var(--color-electric) / <alpha>)` para que TenantTheme pueda
// sobreescribir la variable en runtime y todas las variantes lo respeten.
// Tailwind v3 inlinea los colores definidos en config a hex/rgb literales
// y rompe el theming por tenant.
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'sans-serif'],
      },
      colors: {
        graphite: '#1A1A1E',
        lime: '#B8FA4E',
        sky: '#84A6FF',
        surface: '#F5F5F3',
        border: '#E8E8E6',
        muted: '#6B6B6B',
      },
      borderRadius: {
        sm: '8px',
        md: '16px',
        lg: '24px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [],
}

export default config
