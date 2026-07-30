import { requireAdmin } from '@/lib/page-auth'
import {
  getUltimaSuscripcion,
  getSuscripcionActiva,
} from '@/lib/suscripciones'
import { SUSCRIPCION_PRECIO_COP } from '@/lib/wompi'
import { SuscripcionPanel } from '@/components/admin/SuscripcionPanel'
import { PageHeader } from '@/components/admin/PageHeader'

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
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Configuración"
        tone="arcilla"
        titulo="Suscripción"
        descripcion={
          <>
            Tu acceso a Guacamaya — $
            {new Intl.NumberFormat('es-CO').format(SUSCRIPCION_PRECIO_COP)} COP
            al mes.
          </>
        }
      />

      <SuscripcionPanel
        ultima={ultima}
        pagadaHasta={activa?.pagada_hasta ?? null}
      />
    </div>
  )
}
