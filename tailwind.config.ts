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
      // Paleta "cozy" (beige cálido). Los nombres de token se conservan por
      // compatibilidad con ~300 usos; los valores son los nuevos. Ver la nota
      // en globals.css: graphite=espresso, lime=sol/mostaza, sky=arcilla.
      // `white` se sobreescribe a un blanco papel para que las tarjetas no
      // corten en frío sobre el fondo crema.
      colors: {
        graphite: '#2A2320',
        lime: '#EBBA4F',
        sky: '#D89B7A',
        surface: '#F3EEE5',
        border: '#E3DACB',
        muted: '#736658',
        white: '#FCFAF6',
      },
      borderRadius: {
        sm: '8px',
        md: '16px',
        lg: '24px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(42,35,32,0.05), 0 4px 16px rgba(42,35,32,0.05)',
      },
    },
  },
  plugins: [],
}

export default config
