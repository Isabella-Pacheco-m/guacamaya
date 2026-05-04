import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@auth0/nextjs-auth0'
import { getTenantId, getMiembroId } from '@/lib/auth0'
import {
  AdminInvitationError,
  consumeAdminInvitation,
  getAdminInvitationByToken,
} from '@/lib/admin-invitations'
import { getTenantById } from '@/lib/tenant'
import { patchAppMetadata, Auth0MgmtError } from '@/lib/auth0-mgmt'
import { tenantBaseUrl } from '@/lib/config'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export const dynamic = 'force-dynamic'

// Onboarding del primer admin de un tenant nuevo. Vive en el host raíz
// (mismo origen que el callback de Auth0) — el tenant se resuelve del token.
//
// Flujo:
//   1. Validar que el token existe y no está expirado/usado.
//   2. Si el usuario no tiene sesión → /api/auth/login con returnTo aquí.
//   3. Si la sesión es de otro admin/cliente → mostrar error con logout.
//   4. Escribir app_metadata.tenantId en Auth0 vía Management API.
//   5. Marcar invitación como usada en Postgres (SOLO si Auth0 OK).
//   6. Renderizar pantalla de éxito + botón "Entrar al panel" que es
//      logout + login (única forma de que el claim entre al token).
export default async function AdminClaimPage({
  params,
}: {
  params: { token: string }
}) {
  const invitation = await getAdminInvitationByToken(params.token)
  if (!invitation) {
    return (
      <ErrorScreen
        title="Enlace inválido"
        body="Este enlace no existe o fue revocado."
      />
    )
  }

  if (invitation.used_at) {
    return (
      <ErrorScreen
        title="Enlace ya usado"
        body="Esta invitación se canjeó anteriormente. Pídele al superadmin uno nuevo."
      />
    )
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return (
      <ErrorScreen
        title="Enlace expirado"
        body="Esta invitación ya no es válida. Pídele al superadmin uno nuevo."
      />
    )
  }

  const tenant = await getTenantById(invitation.tenant_id)
  if (!tenant) {
    return (
      <ErrorScreen
        title="Negocio no encontrado"
        body="El tenant asociado a este enlace ya no existe."
      />
    )
  }

  const returnTo = `/admin-claim/${encodeURIComponent(params.token)}`
  const session = await getSession()
  if (!session?.user) {
    redirect(`/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`)
  }

  // Si la sesión ya es admin de OTRO tenant: rehusar — sobreescribir el
  // claim significaría perder acceso al tenant anterior.
  const existingTenantId = getTenantId(session.user)
  if (existingTenantId && existingTenantId !== tenant.id) {
    return (
      <ErrorScreen
        title="Ya eres admin de otro negocio"
        body="Esta cuenta ya tiene acceso a otro tenant. Cierra sesión y entra con un correo distinto para aceptar esta invitación."
        action={{
          href: `/api/auth/logout?returnTo=${encodeURIComponent(returnTo)}`,
          label: 'Cerrar sesión',
        }}
      />
    )
  }

  // Si ya está como admin del MISMO tenant (caso: re-abrió el link después
  // del claim exitoso pero antes del logout/login automático), no
  // necesitamos volver a llamar Auth0 — pasamos directo a la pantalla de
  // éxito / re-login.
  const auth0UserId = session.user.sub as string
  if (!auth0UserId) {
    return (
      <ErrorScreen title="Sesión inválida" body="Tu sesión no incluye un identificador." />
    )
  }

  if (getMiembroId(session.user)) {
    return (
      <ErrorScreen
        title="Cuenta de cliente"
        body="Esta cuenta es de cliente PWA, no puede ser admin. Cierra sesión y entra con otro correo."
        action={{
          href: `/api/auth/logout?returnTo=${encodeURIComponent(returnTo)}`,
          label: 'Cerrar sesión',
        }}
      />
    )
  }

  // Idempotente: si la invitación ya estaba usada por ESTE mismo usuario
  // (caso raro: doble-click), no la marcamos de nuevo. Ya validamos arriba
  // que used_at is null, así que normalmente esto no ocurre — pero por si
  // dos requests entran en paralelo, el RPC consume_admin_invitation usa
  // FOR UPDATE y rechazará el segundo.

  if (existingTenantId !== tenant.id) {
    try {
      await patchAppMetadata(auth0UserId, { tenantId: tenant.id })
    } catch (err) {
      console.error('admin-claim patchAppMetadata', err)
      const msg =
        err instanceof Auth0MgmtError
          ? 'No pudimos actualizar tu cuenta en Auth0. Inténtalo en un momento.'
          : 'Error inesperado. Inténtalo en un momento.'
      return <ErrorScreen title="No se pudo completar" body={msg} />
    }

    try {
      await consumeAdminInvitation(params.token, auth0UserId)
    } catch (err) {
      // En este punto Auth0 ya tiene el tenantId asignado. La invitación no
      // se marca, pero el usuario YA es admin — el siguiente intento dará
      // 409 "ya canjeada", lo cual es benigno. Logueamos y continuamos al
      // success screen.
      if (!(err instanceof AdminInvitationError)) {
        console.error('admin-claim consume', err)
      }
    }
  }

  return <SuccessScreen tenantNombre={tenant.nombre} tenantSlug={tenant.slug} />
}

function SuccessScreen({
  tenantNombre,
  tenantSlug,
}: {
  tenantNombre: string
  tenantSlug: string
}) {
  // Logout + redirect al login del subdominio del tenant. El próximo login
  // recogerá el nuevo tenantId del app_metadata vía la Auth0 Action.
  const dashboardUrl = `${tenantBaseUrl(tenantSlug)}/admin/dashboard`
  const logoutReturnTo = encodeURIComponent(dashboardUrl)
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <Card className="max-w-md w-full text-center">
        <span className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-lime/30 text-graphite text-xl mb-4">
          ✓
        </span>
        <h1 className="text-2xl font-light mb-3">¡Listo!</h1>
        <p className="text-muted text-sm mb-2">
          Ya tienes acceso al panel de{' '}
          <span className="text-graphite font-medium">{tenantNombre}</span>.
        </p>
        <p className="text-muted text-xs mb-6">
          Para terminar, vamos a cerrar tu sesión y volver a entrar — así tu
          nuevo permiso se aplica.
        </p>
        <Link href={`/api/auth/logout?returnTo=${logoutReturnTo}`}>
          <Button className="w-full">Entrar al panel</Button>
        </Link>
      </Card>
    </main>
  )
}

function ErrorScreen({
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
          <Link href={action.href}>
            <Button variant="secondary" className="w-full">
              {action.label}
            </Button>
          </Link>
        )}
      </Card>
    </main>
  )
}
