// Convierte un hex (#RRGGBB) a triplete "R G B" para usar en CSS vars
// con la sintaxis `rgb(var(--x) / <alpha-value>)` de Tailwind.
export function hexToRgbTriplet(hex: string): string | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const v = parseInt(m[1], 16)
  const r = (v >> 16) & 0xff
  const g = (v >> 8) & 0xff
  const b = v & 0xff
  return `${r} ${g} ${b}`
}
