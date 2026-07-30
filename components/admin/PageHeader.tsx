import type { ReactNode } from 'react'

/**
 * Encabezado de página del panel. Replica el ritmo editorial de la landing:
 * eyebrow en versalitas tintado según la sección + titular ligero y ancho.
 * El tinte lo hereda de la sección de la nav (Clientes, Fidelización, …) para
 * que cada área del panel tenga su color, como los bloques de la landing.
 */
export type SeccionTone = 'sol' | 'terra' | 'arcilla' | 'oliva'

const INK: Record<SeccionTone, string> = {
  sol: 'ink-sol',
  terra: 'ink-terra',
  arcilla: 'ink-arcilla',
  oliva: 'ink-oliva',
}

export function PageHeader({
  eyebrow,
  tone = 'terra',
  titulo,
  descripcion,
  accion,
}: {
  eyebrow: string
  tone?: SeccionTone
  titulo: ReactNode
  descripcion?: ReactNode
  /** Bloque opcional a la derecha (botón, filtro, contador). */
  accion?: ReactNode
}) {
  return (
    <header className="flex items-end justify-between gap-6 flex-wrap">
      <div className="min-w-0">
        <p className={`eyebrow mb-3 ${INK[tone]}`}>{eyebrow}</p>
        <h1 className="text-[38px] sm:text-[44px] font-light tracking-[-0.02em] leading-[1.05]">
          {titulo}
        </h1>
        {descripcion && (
          <p className="text-muted text-sm mt-3 max-w-2xl leading-relaxed">
            {descripcion}
          </p>
        )}
      </div>
      {accion && <div className="shrink-0">{accion}</div>}
    </header>
  )
}
