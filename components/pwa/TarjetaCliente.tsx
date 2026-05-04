import { Card } from '@/components/ui/Card'
import type { TarjetaPremioEstado } from '@/lib/tenantQueries'

export function TarjetaCliente({
  sellos,
  tarjetaSize,
  premios,
}: {
  sellos: number
  tarjetaSize: number
  premios: TarjetaPremioEstado[]
}) {
  const cells = Array.from({ length: tarjetaSize }, (_, i) => i + 1)

  // Próximo premio no canjeado y no alcanzado.
  const siguiente = premios.find((p) => !p.alcanzado && !p.canjeado)
  // Premios alcanzados pero aún no canjeados (los reclamas en el mostrador).
  const reclamables = premios.filter((p) => p.alcanzado && !p.canjeado)

  return (
    <Card className="mb-6">
      <p className="text-xs uppercase tracking-wider text-muted mb-2">Tu tarjeta</p>

      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-[40px] font-light leading-none tabular-nums">
          {sellos}
        </span>
        <span className="text-sm text-muted">/ {tarjetaSize} sellos</span>
      </div>

      <div className="grid grid-cols-10 gap-1.5 mb-4">
        {cells.map((n) => {
          const filled = n <= sellos
          return (
            <div
              key={n}
              className={
                filled
                  ? 'aspect-square rounded-full bg-graphite text-lime text-[10px] flex items-center justify-center'
                  : 'aspect-square rounded-full border border-border'
              }
            >
              {filled && <span>✓</span>}
            </div>
          )
        })}
      </div>

      {reclamables.length > 0 && (
        <div className="bg-lime/30 rounded-md px-3 py-2 mb-3 text-xs text-graphite">
          Tienes {reclamables.length === 1 ? 'un premio' : `${reclamables.length} premios`} listos para reclamar en el mostrador.
        </div>
      )}

      {premios.length === 0 ? (
        <p className="text-xs text-muted">
          Aún no hay premios definidos.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {premios.map((p) => (
            <li
              key={p.threshold}
              className="flex items-center justify-between text-xs"
            >
              <span className={p.alcanzado && !p.canjeado ? 'text-graphite' : 'text-muted'}>
                <span className="tabular-nums font-medium">{p.threshold}</span>{' '}
                · {p.descripcion}
              </span>
              <span className="text-muted">
                {p.canjeado ? 'canjeado' : p.alcanzado ? 'listo' : `faltan ${p.threshold - sellos}`}
              </span>
            </li>
          ))}
        </ul>
      )}

      {siguiente && (
        <p className="text-xs text-muted mt-3">
          Próximo: {siguiente.descripcion} · faltan {siguiente.threshold - sellos} sellos.
        </p>
      )}
    </Card>
  )
}
