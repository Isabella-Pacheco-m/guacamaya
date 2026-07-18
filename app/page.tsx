import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSession } from '@auth0/nextjs-auth0'
import { getTenantId, getMiembroId } from '@/lib/auth0'
import { isSuperadmin } from '@/lib/superadmin-auth'
import { findMiembroByAuth0, getMiembroByAuth0 } from '@/lib/invitaciones'
import {
  getTenantBySlug,
  findTenantByAdminEmail,
  countMiembros,
} from '@/lib/tenant'
import { getTenantFeatures } from '@/lib/tenant-features'
import {
  listTarjetaPremiosForMiembro,
  listNotas,
  getProximaCaducidad,
  listRecompensasActivas,
} from '@/lib/tenantQueries'
import { listFeedPostsPublic } from '@/lib/feed'
import { listGaleriaAprobadas } from '@/lib/galeria'
import { listRetosPwa } from '@/lib/retos'
import { tenantBaseUrl } from '@/lib/config'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { TenantPwaHome } from '@/components/pwa/TenantPwaHome'
import { TenantJoin } from '@/components/pwa/TenantJoin'
import { TenantWelcome } from '@/components/pwa/TenantWelcome'
import { RootLanding } from '@/components/pwa/RootLanding'

export const dynamic = 'force-dynamic'

/** Días de antelación con los que la home avisa de puntos por vencer. */
const AVISO_CADUCIDAD_DIAS = 45

export default async function Home({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const slug = headers().get('x-tenant-slug') || ''
  if (slug) return renderTenantHome(slug)
  return renderRootHome(searchParams.error)
}

async function renderTenantHome(slug: string) {
  const tenant = await getTenantBySlug(slug)
  if (!tenant) {
    return (
      <CenteredCard
        title="Negocio no encontrado"
        body={`No existe un club con el slug '${slug}'.`}
      />
    )
  }

  const session = await getSession()
  if (!session?.user) {
    // Landing pre-login: se arma con lo que el negocio ya configuró para que
    // el visitante sepa qué hay adentro antes de decidir entrar.
    const [features, recompensas, miembrosCount] = await Promise.all([
      getTenantFeatures(tenant.id),
      listRecompensasActivas(tenant.id),
      countMiembros(tenant.id),
    ])
    return (
      <TenantWelcome
        tenant={tenant}
        features={features}
        recompensas={recompensas}
        miembrosCount={miembrosCount}
      />
    )
  }

  // Admin de algún tenant que abrió un subdominio: no debería usar la PWA cliente.
  if (getTenantId(session.user) && !getMiembroId(session.user)) {
    return (
      <CenteredCard
        title="Cuenta de admin"
        body="Estás logueado como admin de un tenant. Cierra sesión y entra con la cuenta de cliente."
        action={{ href: '/api/auth/logout', label: 'Cerrar sesión' }}
      />
    )
  }

  const auth0UserId = session.user.sub as string
  const miembro = await getMiembroByAuth0(tenant.id, auth0UserId)
  if (!miembro) {
    const features = await getTenantFeatures(tenant.id)
    // Registro abierto: el usuario logueado puede unirse de un clic.
    if (features.registro_abierto) {
      return (
        <TenantJoin
          nombre={tenant.nombre}
          logoUrl={tenant.logo_url}
          colorPrimario={tenant.color_primario}
        />
      )
    }
    // Comunidad por invitación: necesita un enlace del negocio.
    return (
      <CenteredCard
        title="Este club es por invitación"
        body={`Pídele al negocio de ${tenant.nombre} un enlace para unirte.`}
        action={{ href: '/api/auth/logout', label: 'Cerrar sesión' }}
      />
    )
  }

  const features = await getTenantFeatures(tenant.id)
  const [tarjetaPremios, ultimoPost, notas, fotos, retos, caducidad] = await Promise.all([
    features.tarjeta_enabled
      ? listTarjetaPremiosForMiembro(tenant.id, miembro.id)
      : Promise.resolve([]),
    features.feed_enabled
      ? listFeedPostsPublic(tenant.id, 1).then((posts) => posts[0] ?? null)
      : Promise.resolve(null),
    features.notas_enabled ? listNotas(tenant.id, 2) : Promise.resolve([]),
    features.galeria_enabled
      ? listGaleriaAprobadas(tenant.id, 4)
      : Promise.resolve([]),
    features.retos_enabled ? listRetosPwa(tenant.id) : Promise.resolve([]),
    getProximaCaducidad(tenant.id, miembro.id),
  ])

  // Solo se avisa en la home cuando el vencimiento ya está cerca; el detalle
  // completo (siempre visible) está en /puntos.
  const diasParaVencer =
    caducidad.fecha !== null
      ? Math.ceil(
          (new Date(`${caducidad.fecha}T12:00:00Z`).getTime() - Date.now()) /
            86_400_000
        )
      : null
  const caducidadProxima =
    caducidad.puntos > 0 &&
    caducidad.fecha !== null &&
    diasParaVencer !== null &&
    diasParaVencer <= AVISO_CADUCIDAD_DIAS
      ? { puntos: caducidad.puntos, fecha: caducidad.fecha }
      : null

  const retoActivo = retos.find((r) => r.estado === 'ABIERTO') ?? null
  const comunidad = {
    notas,
    fotos,
    ultimoPost,
    retoActivo,
    hayAlgo:
      notas.length > 0 ||
      fotos.length > 0 ||
      ultimoPost !== null ||
      retoActivo !== null ||
      features.sorteos_enabled ||
      features.lanzamientos_enabled ||
      features.ranking_enabled,
  }

  return (
    <TenantPwaHome
      tenant={tenant}
      miembro={miembro}
      features={features}
      tarjetaPremios={tarjetaPremios}
      comunidad={comunidad}
      caducidadProxima={caducidadProxima}
    />
  )
}

async function renderRootHome(errorCode: string | undefined) {
  const session = await getSession()

  // El callback de Auth0 siempre vuelve al apex (AUTH0_BASE_URL), aunque el
  // "Ingresar" se haya iniciado en un subdominio. Acá decidimos a dónde
  // mandar a cada identidad. La cookie de sesión es compartida en
  // .guacamaya.net, así que el subdominio destino ya ve la sesión.
  if (session?.user) {
    // Superadmin (email en allow-list) → panel global. Se chequea primero
    // para que un superadmin que además sea admin/cliente caiga en su panel.
    if (await isSuperadmin()) {
      redirect('/superadmin')
    }

    const email = String(session.user.email ?? '').toLowerCase()
    const verified = Boolean(session.user.email_verified)

    // Admin de negocio: identidad por email asignado al tenant (no por claim
    // de Auth0). Mandarlo al panel de su subdominio.
    if (email && verified) {
      const adminTenant = await findTenantByAdminEmail(email)
      if (adminTenant) {
        redirect(`${tenantBaseUrl(adminTenant.slug)}/admin/dashboard`)
      }
    }

    // Cliente vinculado → subdominio de su tenant.
    const sub = session.user.sub as string | undefined
    if (sub) {
      const linked = await findMiembroByAuth0(sub)
      if (linked) redirect(tenantBaseUrl(linked.tenant.slug))
    }
  }

  const errorMsg = mapError(errorCode)

  return (
    <RootLanding sessionUnlinked={Boolean(session?.user)} errorMsg={errorMsg} />
  )
}

function CenteredCard({
  title,
  body,
  action,
}: {
  title: string
  body: string
  action?: { href: string; label: string }
}) {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <Card className="max-w-md w-full text-center">
        <h1 className="text-2xl font-light mb-3">{title}</h1>
        <p className="text-muted text-sm mb-6">{body}</p>
        {action && (
          <a href={action.href}>
            <Button variant="secondary" className="w-full">
              {action.label}
            </Button>
          </a>
        )}
      </Card>
    </main>
  )
}

function mapError(code: string | undefined): string | null {
  switch (code) {
    case 'missing-tenant':
      return 'Tu cuenta no tiene tenant asignado. Contacta al admin.'
    case 'not-admin':
      return 'Esta sección es solo para administradores del tenant.'
    case 'not-superadmin':
      return 'Esta sección es solo para superadmins de la plataforma.'
    default:
      return null
  }
}
