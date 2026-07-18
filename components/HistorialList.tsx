import { Card } from '@/components/ui/Card'
import type { Transaccion } from '@/types'

const numFmt = new Intl.NumberFormat('es-CO')
const dateFmt = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Bogota',
})

const TIPO_LABEL: Record<Transaccion['tipo'], string> = {
  COMPRA: 'Compra',
  CANJE: 'Canje',
  AJUSTE: 'Ajuste',
  REGALO: 'Regalo',
  CUMPLEANOS: 'Cumpleaños',
  SELLO: 'Sello',
  SELLO_CANJE: 'Premio canjeado',
  GALERIA: 'Foto en galería',
  RETO: 'Reto cumplido',
}

export function HistorialList({
  transacciones,
  emptyText = 'Aún no hay movimientos.',
}: {
  transacciones: Transaccion[]
  emptyText?: string
}) {
  if (transacciones.length === 0) {
    return (
      <Card className="text-center">
        <p className="text-sm text-muted">{emptyText}</p>
      </Card>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {transacciones.map((t) => (
        <li key={t.id}>
          <Card className="py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{TIPO_LABEL[t.tipo]}</p>
                <p className="text-xs text-muted mt-0.5">
                  {dateFmt.format(new Date(t.created_at))}
                </p>
                {t.nota && (
                  <p className="text-xs text-muted mt-1 truncate">{t.nota}</p>
                )}
              </div>
              <p
                className={`text-lg font-light shrink-0 ${
                  t.puntos_delta >= 0 ? 'text-graphite' : 'text-muted'
                }`}
              >
                {t.puntos_delta >= 0 ? '+' : ''}
                {numFmt.format(t.puntos_delta)}
              </p>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  )
}
