import type { TarjetaPremioEstado } from '@/lib/tenantQueries'
import {
  ESTILO_CLIP,
  ESTILO_GLYPH,
  estiloRadiusClass,
  type TarjetaEstilo,
} from '@/lib/tarjeta'

// Devuelve un color de texto legible (blanco u oscuro) para un fondo hex
// dado, usando luminancia relativa estándar (sRGB → WCAG).
function readableTextOn(hex: string): string {
  const m = hex.replace('#', '')
  const r = parseInt(m.slice(0, 2), 16) / 255
  const g = parseInt(m.slice(2, 4), 16) / 255
  const b = parseInt(m.slice(4, 6), 16) / 255
  const lin = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  return L > 0.55 ? '#1A1A1E' : '#FFFFFF'
}

function StampGlyph({ estilo }: { estilo: TarjetaEstilo }) {
  // Dimensionamos el glyph en cqw (relativo al ancho del sello, que es el
  // container query container) para que se vea grande y proporcional tanto en
  // el preview ancho del admin como en la PWA angosta del cliente. El ✓ se ve
  // mejor un poco más pequeño que los símbolos figurativos.
  const isCheck = estilo === 'circulo' || estilo === 'cuadrado'
  return (
    <span className={`leading-none ${isCheck ? 'text-[length:46cqw]' : 'text-[length:58cqw]'}`}>
      {ESTILO_GLYPH[estilo]}
    </span>
  )
}

export function TarjetaCliente({
  tenantNombre,
  miembroNombre,
  sellos,
  tarjetaSize,
  premios,
  colorFondo,
  colorSello,
  estiloSello,
}: {
  tenantNombre: string
  miembroNombre: string
  sellos: number
  tarjetaSize: number
  premios: TarjetaPremioEstado[]
  colorFondo: string
  colorSello: string
  estiloSello: TarjetaEstilo
}) {
  const cells = Array.from({ length: tarjetaSize }, (_, i) => i + 1)
  const reclamables = premios.filter((p) => p.alcanzado && !p.canjeado)
  const siguiente = premios.find((p) => !p.alcanzado && !p.canjeado)

  const cardText = readableTextOn(colorFondo)
  const muted = cardText === '#FFFFFF' ? 'rgba(255,255,255,0.7)' : 'rgba(26,26,30,0.65)'
  const empty = cardText === '#FFFFFF' ? 'rgba(255,255,255,0.18)' : 'rgba(26,26,30,0.12)'

  // Grid responsivo: máx 5 columnas para que cada sello sea grande y visible.
  const cols = Math.min(5, tarjetaSize)
  const stampShape = estiloRadiusClass(estiloSello)
  const clipPath = ESTILO_CLIP[estiloSello]

  return (
    <div className="mb-6">
      <div
        className="rounded-[24px] p-6 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.35)] relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${colorFondo} 0%, ${colorFondo} 60%, ${shade(colorFondo, 18)} 100%)`,
          color: cardText,
        }}
      >
        <div
          aria-hidden
          className="absolute -top-12 -right-12 h-40 w-40 rounded-full opacity-[0.12]"
          style={{ background: colorSello }}
        />

        <div className="relative flex items-start justify-between mb-5">
          <div className="min-w-0">
            <p
              className="text-[10px] uppercase tracking-[0.2em]"
              style={{ color: muted }}
            >
              Tarjeta de fidelización
            </p>
            <p className="text-[15px] font-medium mt-1 truncate">
              {tenantNombre}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: muted }}>
              Sellos
            </p>
            <p className="text-2xl font-light tabular-nums leading-none mt-1">
              <span className="font-medium">{sellos}</span>
              <span style={{ color: muted }}>/{tarjetaSize}</span>
            </p>
          </div>
        </div>

        <div
          className="relative grid gap-2 mb-5"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {cells.map((n) => {
            const filled = n <= sellos
            return (
              <div
                key={n}
                className={`aspect-square ${stampShape} flex items-center justify-center transition-transform [container-type:inline-size]`}
                style={
                  filled
                    ? {
                        background: colorSello,
                        color: readableTextOn(colorSello),
                        boxShadow: clipPath ? 'none' : '0 2px 6px rgba(0,0,0,0.18)',
                        clipPath,
                      }
                    : {
                        background: clipPath ? empty : 'transparent',
                        border: clipPath ? 'none' : `1.5px dashed ${empty}`,
                        color: muted,
                        clipPath,
                      }
                }
              >
                {filled ? (
                  <StampGlyph estilo={estiloSello} />
                ) : (
                  <span className="text-[10px] tabular-nums">{n}</span>
                )}
              </div>
            )
          })}
        </div>

        <div className="relative flex items-end justify-between gap-3 pt-3 border-t" style={{ borderColor: empty }}>
          <p className="text-[11px] tracking-wider truncate" style={{ color: muted }}>
            {miembroNombre.toUpperCase()}
          </p>
          {siguiente && (
            <p className="text-[11px] text-right shrink-0" style={{ color: muted }}>
              Próximo · {siguiente.threshold} sellos
            </p>
          )}
        </div>
      </div>

      {(reclamables.length > 0 || premios.length > 0) && (
        <div className="mt-3 rounded-md bg-white border border-border p-4">
          {reclamables.length > 0 && (
            <div
              className="mb-3 rounded-md px-3 py-2 text-xs"
              style={{ background: `${colorSello}33`, color: '#1A1A1E' }}
            >
              Tienes {reclamables.length === 1 ? 'un premio' : `${reclamables.length} premios`} listos para reclamar en mostrador.
            </div>
          )}
          {premios.length === 0 ? (
            <p className="text-xs text-muted">Aún no hay premios definidos.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {premios.map((p) => (
                <li
                  key={p.threshold}
                  className="flex items-center justify-between text-xs"
                >
                  <span
                    className={
                      p.alcanzado && !p.canjeado ? 'text-graphite' : 'text-muted'
                    }
                  >
                    <span className="tabular-nums font-medium">
                      {p.threshold}
                    </span>{' '}
                    · {p.descripcion}
                  </span>
                  <span className="text-muted">
                    {p.canjeado
                      ? 'canjeado'
                      : p.alcanzado
                        ? 'listo'
                        : `faltan ${p.threshold - sellos}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// Aclara u oscurece un color hex en N% (positivo aclara, negativo oscurece).
function shade(hex: string, pct: number): string {
  const m = hex.replace('#', '')
  const r = parseInt(m.slice(0, 2), 16)
  const g = parseInt(m.slice(2, 4), 16)
  const b = parseInt(m.slice(4, 6), 16)
  const adj = (c: number) => {
    const t = pct < 0 ? 0 : 255
    const p = Math.abs(pct) / 100
    return Math.round((t - c) * p + c)
  }
  const to2 = (n: number) => n.toString(16).padStart(2, '0')
  return `#${to2(adj(r))}${to2(adj(g))}${to2(adj(b))}`
}
