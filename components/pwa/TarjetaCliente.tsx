import type { CSSProperties } from 'react'
import type { TarjetaPremioEstado } from '@/lib/tenantQueries'
import {
  ESTILO_CLIP,
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

// Iconos del sello como SVG: se centran de forma determinística (sin los
// desajustes de baseline de los glyphs Unicode) y escalan con el sello porque
// el ancho/alto va en % del contenedor.
function StarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  )
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

function GiftIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13" />
      <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8M16.5 8a2.5 2.5 0 0 0 0-5C13 3 12 8 12 8" />
    </svg>
  )
}

// El emblema del sello relleno depende del estilo elegido. Para diamante y
// hexágono la forma del sello ya comunica el estilo, así que adentro va un
// check (evita el ícono redundante de "hexágono dentro de hexágono").
function EmblemIcon({
  estilo,
  className,
}: {
  estilo: TarjetaEstilo
  className?: string
}) {
  if (estilo === 'estrella') return <StarIcon className={className} />
  if (estilo === 'corazon') return <HeartIcon className={className} />
  return <CheckIcon className={className} />
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
  const premioPorUmbral = new Map(premios.map((p) => [p.threshold, p]))
  const reclamables = premios.filter((p) => p.alcanzado && !p.canjeado)
  const siguiente = premios.find((p) => !p.alcanzado && !p.canjeado)

  const cardText = readableTextOn(colorFondo)
  const muted = cardText === '#FFFFFF' ? 'rgba(255,255,255,0.7)' : 'rgba(26,26,30,0.65)'
  const empty = cardText === '#FFFFFF' ? 'rgba(255,255,255,0.18)' : 'rgba(26,26,30,0.12)'

  // Elegimos el número de columnas que reparte los sellos en filas parejas
  // (5→5, 8→4, 10→5, 12→4). Si ningún divisor entra, usamos 5 y el
  // flex-wrap + justify-center de abajo centra la última fila para que no se
  // vea incompleta con tamaños "raros" (7, 11, …).
  const cols =
    [5, 4, 3].find((c) => tarjetaSize % c === 0) ??
    (tarjetaSize <= 5 ? tarjetaSize : 5)
  const cellWidth = `calc((100% - ${(cols - 1) * 0.5}rem) / ${cols})`
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

        <div className="relative flex flex-wrap justify-center gap-2 mb-5">
          {cells.map((n) => {
            const filled = n <= sellos
            const esPremio = premioPorUmbral.has(n)

            let cellStyle: CSSProperties
            if (filled) {
              cellStyle = {
                background: colorSello,
                color: readableTextOn(colorSello),
                boxShadow: clipPath ? 'none' : '0 2px 6px rgba(0,0,0,0.18)',
                clipPath,
              }
            } else if (esPremio) {
              // Premio aún no alcanzado: resaltado en el color del sello para
              // que el cliente vea que ahí lo espera una recompensa.
              cellStyle = {
                background: clipPath ? `${colorSello}26` : 'transparent',
                border: clipPath ? 'none' : `1.5px solid ${colorSello}`,
                color: colorSello,
                clipPath,
              }
            } else {
              cellStyle = {
                background: clipPath ? empty : 'transparent',
                border: clipPath ? 'none' : `1.5px dashed ${empty}`,
                color: muted,
                clipPath,
              }
            }
            cellStyle.width = cellWidth

            return (
              <div
                key={n}
                className={`aspect-square ${stampShape} flex items-center justify-center transition-transform [container-type:inline-size]`}
                style={cellStyle}
              >
                {esPremio ? (
                  <GiftIcon className="w-[46%] h-[46%]" />
                ) : filled ? (
                  <EmblemIcon
                    estilo={estiloSello}
                    className={
                      estiloSello === 'estrella' || estiloSello === 'corazon'
                        ? 'w-[52%] h-[52%]'
                        : 'w-[46%] h-[46%]'
                    }
                  />
                ) : (
                  <span className="text-[length:26cqw] font-medium tabular-nums leading-none">
                    {n}
                  </span>
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
