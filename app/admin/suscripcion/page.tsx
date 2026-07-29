import { requireAdmin } from '@/lib/page-auth'
import {
  getUltimaSuscripcion,
  getSuscripcionActiva,
} from '@/lib/suscripciones'
import { SUSCRIPCION_PRECIO_COP } from '@/lib/wompi'
import { SuscripcionPanel } from '@/components/admin/SuscripcionPanel'

export const dynamic = 'force-dynamic'

// Estado de la suscripción a la plataforma. El vínculo es por email admin
// (suscripciones.email == tenants.admin_email); los tenants creados antes del
// cobro no tienen filas y se muestran como "sin suscripción registrada".
export default async function SuscripcionPage() {
  const { user } = await requireAdmin()
  const email = String(user.email ?? '').toLowerCase()

  const [ultima, activa] = await Promise.all([
    getUltimaSuscripcion(email),
    getSuscripcionActiva(email),
  ])

  return (
    <div>
      <h1 className="text-[32px] font-light tracking-tight mb-2">
        Suscripción
      </h1>
      <p className="text-sm text-muted mb-8">
        Tu acceso a Guacamaya — ${new Intl.NumberFormat('es-CO').format(SUSCRIPCION_PRECIO_COP)}{' '}
        COP al mes.
      </p>

      <SuscripcionPanel
        ultima={ultima}
        pagadaHasta={activa?.pagada_hasta ?? null}
      />
    </div>
  )
}
