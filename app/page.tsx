import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSession } from '@auth0/nextjs-auth0'
import { getTenantId, getMiembroId } from '@/lib/auth0'
import { isSuperadmin } from '@/lib/superadmin-auth'
import { findMiembroByAuth0, getMiembroByAuth0 } from '@/lib/invitaciones'
import { getTenantBySlug, findTenantByAdminEmail } from '@/lib/tenant'
import { getTenantFeatures } from '@/lib/tenant-features'
import { listTarjetaPremiosForMiembro } from '@/lib/tenantQueries'
import { listFeedPosts } from '@/lib/feed'
import { tenantBaseUrl } from '@/lib/config'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { TenantPwaHome } from '@/components/pwa/TenantPwaHome'
import { TenantTheme } from '@/components/pwa/TenantTheme'
import { RootLanding } from '@/components/pwa/RootLanding'

export const dynamic = 'force-dynamic'

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
    return (
      <main className="min-h-screen bg-tenant-halo flex items-center justify-center px-6">
        <TenantTheme color={tenant.color_primario} />
        <div className="max-w-md w-full text-center">
          {tenant.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tenant.logo_url}
              alt={tenant.nombre}
              className="h-20 w-20 rounded-md object-contain mx-auto mb-8"
            />
          )}
          <p className="text-[11px] uppercase tracking-[0.2em] text-electric mb-4">
            Club de miembros
          </p>
          <h1 className="text-[44px] font-light leading-[1.05] tracking-tight mb-6">
            {tenant.nombre}
          </h1>
          <p className="text-muted text-sm mb-10 max-w-xs mx-auto">
            Acumula puntos por cada compra y canjea recompensas que te encantarán.
          </p>
          <a href="/api/auth/login">
            <Button className="w-full">Ingresar</Button>
          </a>
        </div>
      </main>
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
    return (
      <CenteredCard
        title="No tienes acceso a este club"
        body={`Tu cuenta no está vinculada a ${tenant.nombre}. Pídele al admin un enlace de invitación.`}
        action={{ href: '/api/auth/logout', label: 'Cerrar sesión' }}
      />
    )
  }

  const features = await getTenantFeatures(tenant.id)
  const [tarjetaPremios, ultimoPost] = await Promise.all([
    features.tarjeta_enabled
      ? listTarjetaPremiosForMiembro(tenant.id, miembro.id)
      : Promise.resolve([]),
    features.feed_enabled
      ? listFeedPosts(tenant.id, 1).then((posts) => posts[0] ?? null)
      : Promise.resolve(null),
  ])
  return (
    <TenantPwaHome
      tenant={tenant}
      miembro={miembro}
      features={features}
      tarjetaPremios={tarjetaPremios}
      ultimoPost={ultimoPost}
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
