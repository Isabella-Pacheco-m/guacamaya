import { redirect } from 'next/navigation'
import { getSession } from '@auth0/nextjs-auth0'
import { getTenantId } from '@/lib/auth0'
import {
  getTenantIdByToken,
  redeemInvitacion,
  InvitacionError,
} from '@/lib/invitaciones'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export const dynamic = 'force-dynamic'

// Esta página vive en el host raíz (= AUTH0_BASE_URL) — no en un subdominio
// de tenant — para que la cookie de estado del SDK de Auth0 quede en el mismo
// origen que el callback. El tenant se resuelve del token (único global).
export default async function InvitePage({
  params,
}: {
  params: { token: string }
}) {
  const tenantId = await getTenantIdByToken(params.token)
  if (!tenantId) {
    return (
      <ErrorScreen
        title="Enlace inválido"
        body="Este enlace no existe o fue revocado."
      />
    )
  }

  const returnTo = `/invite/${encodeURIComponent(params.token)}`
  const session = await getSession()
  if (!session?.user) {
    redirect(`/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`)
  }

  // Un admin del tenant no debería vincular su Auth0 a un perfil de miembro.
  if (getTenantId(session.user)) {
    return (
      <ErrorScreen
        title="Cuenta de admin"
        body="Estás logueado como admin de un tenant. Cierra sesión y abre el enlace con la cuenta del cliente."
        action={{ href: '/api/auth/logout', label: 'Cerrar sesión' }}
      />
    )
  }

  const auth0UserId = session.user.sub as string
  if (!auth0UserId) {
    return (
      <ErrorScreen
        title="Sesión inválida"
        body="Tu sesión no incluye un identificador de usuario."
      />
    )
  }

  try {
    await redeemInvitacion(tenantId, params.token, auth0UserId)
  } catch (err) {
    if (err instanceof InvitacionError) {
      return (
        <ErrorScreen
          title="No pudimos canjear el enlace"
          body={err.message}
          action={{ href: '/api/auth/logout', label: 'Cerrar sesión' }}
        />
      )
    }
    console.error('invite redeem', err)
    return <ErrorScreen title="Error inesperado" body="Inténtalo de nuevo en un momento." />
  }

  // Éxito → al home (la PWA del cliente vive aquí cuando exista).
  redirect('/')
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
