import type { RankingRow, RankingPosicion } from '@/lib/ranking'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'

const numFmt = new Intl.NumberFormat('es-CO')

// Los tres primeros llevan medalla; del cuarto en adelante, el número.
const MEDALLAS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

export function RankingList({
  filas,
  yo,
  miembroId,
  /** En "Todo" se muestra un anticipo corto; la lista completa va en su pestaña. */
  compacto = false,
}: {
  filas: RankingRow[]
  yo: RankingPosicion
  miembroId: string
  compacto?: boolean
}) {
  if (filas.length === 0) {
    return (
      <Card className="text-center" padding="lg">
        <p className="text-sm text-muted">
          Todavía nadie acumula puntos. ¡Sé el primero!
        </p>
      </Card>
    )
  }

  const visibles = compacto ? filas.slice(0, 3) : filas
  // Si el miembro quedó fuera del top visible, se le ancla su propia fila
  // abajo para que siempre se ubique en la tabla.
  const estoyEnLaLista = visibles.some((f) => f.miembro_id === miembroId)

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-2">
        {visibles.map((f) => (
          <li key={f.miembro_id}>
            <RankingFila fila={f} destacado={f.miembro_id === miembroId} />
          </li>
        ))}
      </ul>

      {!estoyEnLaLista && yo.posicion !== null && (
        <>
          <p className="text-center text-muted text-xs leading-none">···</p>
          <RankingFila
            fila={{
              miembro_id: miembroId,
              nombre: 'Tú',
              avatar_url: null,
              puntos: yo.puntos,
              posicion: yo.posicion,
            }}
            destacado
          />
        </>
      )}

      {yo.posicion === null && (
        <p className="text-xs text-muted text-center mt-1">
          Acumula tus primeros puntos para entrar en la tabla.
        </p>
      )}

      {!compacto && yo.total > 0 && (
        <p className="text-[11px] text-muted text-center mt-2">
          {yo.total === 1
            ? '1 miembro con puntos en el club'
            : `${numFmt.format(yo.total)} miembros con puntos en el club`}
        </p>
      )}
    </div>
  )
}

function RankingFila({
  fila,
  destacado,
}: {
  fila: RankingRow
  destacado: boolean
}) {
  const medalla = MEDALLAS[fila.posicion]
  return (
    <div
      className={
        'flex items-center gap-3 rounded-2xl px-4 py-3 shadow-card ' +
        (destacado
          ? 'bg-graphite text-white ring-1 ring-graphite'
          : 'bg-white text-graphite')
      }
    >
      <span
        className={
          'w-7 shrink-0 text-center tabular-nums ' +
          (medalla ? 'text-lg leading-none' : 'text-sm font-medium')
        }
        aria-hidden={Boolean(medalla)}
      >
        {medalla ?? fila.posicion}
      </span>
      {medalla && <span className="sr-only">Puesto {fila.posicion}</span>}

      <Avatar name={fila.nombre} src={fila.avatar_url} size={36} />

      <p className="flex-1 min-w-0 text-sm font-medium truncate">
        {fila.nombre}
      </p>

      <p
        className={
          'shrink-0 text-sm tabular-nums ' +
          (destacado ? 'text-lime' : 'text-muted')
        }
      >
        {numFmt.format(fila.puntos)}
        <span className="text-[11px] ml-1">pts</span>
      </p>
    </div>
  )
}
