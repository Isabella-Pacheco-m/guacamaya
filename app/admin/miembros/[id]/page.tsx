import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/page-auth'
import {
  getMiembroById,
  listTransaccionesForMiembro,
  listTarjetaPremiosForMiembro,
} from '@/lib/tenantQueries'
import { getTenantById } from '@/lib/tenant'
import { getTenantFeatures } from '@/lib/tenant-features'
import { listInvitacionesForMiembro } from '@/lib/invitaciones'
import { Card } from '@/components/ui/Card'
import { NivelBadge } from '@/components/ui/Badge'
import { RegistrarCompraForm } from '@/components/admin/RegistrarCompraForm'
import { InvitacionesPanel } from '@/components/admin/InvitacionesPanel'
import { TarjetaMiembroPanel } from '@/components/admin/TarjetaMiembroPanel'
import { HistorialList } from '@/components/HistorialList'

export const dynamic = 'force-dynamic'

const COP = new Intl.NumberFormat('es-CO')

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function formatTelefono(telefono: string | null): string {
  if (!telefono) return '—'
  const m = telefono.match(/^57(\d{3})(\d{3})(\d{4})$/)
  return m ? `+57 ${m[1]} ${m[2]} ${m[3]}` : telefono
}

export default async function MiembroDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const { tenantId } = await requireAdmin()
  if (!UUID_RE.test(params.id)) notFound()

  const [miembro, tenant, features, invitaciones, transacciones] = await Promise.all([
    getMiembroById(tenantId, params.id),
    getTenantById(tenantId),
    getTenantFeatures(tenantId),
    listInvitacionesForMiembro(tenantId, params.id),
    listTransaccionesForMiembro(tenantId, params.id, 100),
  ])
  if (!miembro || !tenant) notFound()

  const tarjetaPremios = features.tarjeta_enabled
    ? await listTarjetaPremiosForMiembro(tenantId, miembro.id)
    : []

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/miembros"
        className="text-electric text-xs hover:underline w-fit"
      >
        ← Volver a miembros
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[44px] font-light tracking-tight leading-tight">{miembro.nombre}</h1>
          <p className="text-muted text-sm mt-2">
            {formatTelefono(miembro.telefono)}
            {miembro.email && ` · ${miembro.email}`}
          </p>
        </div>
        <NivelBadge nivel={miembro.nivel} className="text-sm px-4 py-1.5" />
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card>
          <div className="text-xs text-muted uppercase tracking-wide">Puntos disponibles</div>
          <div className="mt-2 text-[32px] font-light">{COP.format(miembro.puntos_actuales)}</div>
        </Card>
        <Card>
          <div className="text-xs text-muted uppercase tracking-wide">Puntos histórico</div>
          <div className="mt-2 text-[32px] font-light">{COP.format(miembro.puntos_historicos)}</div>
        </Card>
        <Card>
          <div className="text-xs text-muted uppercase tracking-wide">Próximo nivel</div>
          <div className="mt-2 text-sm">
            {nextLevelHint(miembro.puntos_historicos)}
          </div>
        </Card>
      </section>

      <Card>
        <h2 className="text-sm font-medium mb-4">Registrar compra</h2>
        <RegistrarCompraForm
          miembroId={miembro.id}
          puntosPorMil={tenant.puntos_por_mil}
        />
      </Card>

      {features.tarjeta_enabled && (
        <Card>
          <h2 className="text-sm font-medium mb-4">Tarjeta de fidelización</h2>
          <TarjetaMiembroPanel
            miembroId={miembro.id}
            initialSellos={miembro.sellos_actuales}
            tarjetaSize={features.tarjeta_size}
            initialPremios={tarjetaPremios}
          />
        </Card>
      )}

      <Card>
        <h2 className="text-sm font-medium mb-4">Invitación</h2>
        <InvitacionesPanel miembroId={miembro.id} initial={invitaciones} />
      </Card>

      <section>
        <h2 className="text-sm font-medium mb-4">Historial de movimientos</h2>
        <HistorialList
          transacciones={transacciones}
          emptyText="Este miembro aún no tiene movimientos."
        />
      </section>
    </div>
  )
}

function nextLevelHint(puntosHistoricos: number): string {
  if (puntosHistoricos < 500) {
    return `Faltan ${(500 - puntosHistoricos).toLocaleString('es-CO')} puntos para PLATA`
  }
  if (puntosHistoricos < 2000) {
    return `Faltan ${(2000 - puntosHistoricos).toLocaleString('es-CO')} puntos para ORO`
  }
  return 'Nivel máximo alcanzado'
}
