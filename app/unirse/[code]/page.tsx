import { redirect } from 'next/navigation'
import { getSession } from '@auth0/nextjs-auth0'
import { getTenantByJoinCode } from '@/lib/tenant'
import { selfRegisterMiembro } from '@/lib/invitaciones'
import { tenantBaseUrl } from '@/lib/config'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export const dynamic = 'force-dynamic'

// Enlace de invitación a la comunidad. Vive en el host raíz (= AUTH0_BASE_URL),
// mismo origen que el callback de Auth0; el tenant se resuelve del código
// (único global). Quien abra el enlace e inicie sesión queda asignado como
// miembro — funciona aunque el registro abierto esté apagado (el código es la
// autorización).
export default async function UnirsePage({
  params,
}: {
  params: { code: string }
}) {
  const tenant = await getTenantByJoinCode(params.code)
  if (!tenant) {
    return (
      <ErrorScreen
        title="Enlace inválido"
        body="Este enlace de invitación no existe o fue regenerado. Pídele al negocio uno nuevo."
      />
    )
  }

  const returnTo = `/unirse/${encodeURIComponent(params.code)}`
  const session = await getSession()
  if (!session?.user) {
    redirect(`/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`)
  }

  const auth0UserId = session.user.sub as string | undefined
  if (!auth0UserId) {
    return (
      <ErrorScreen
        title="Sesión inválida"
        body="Tu sesión no incluye un identificador de usuario."
      />
    )
  }

  const nombre =
    (session.user.name as string) ||
    (session.user.nickname as string) ||
    (session.user.email as string) ||
    'Cliente'
  const email = (session.user.email as string | undefined) ?? null

  try {
    await selfRegisterMiembro(tenant.id, auth0UserId, nombre, email)
  } catch (err) {
    console.error('unirse self-register', err)
    return (
      <ErrorScreen
        title="No pudimos completar"
        body="Inténtalo de nuevo en un momento."
      />
    )
  }

  // Ya es miembro → al home de la PWA en el subdominio del tenant.
  redirect(`${tenantBaseUrl(tenant.slug)}`)
}

function ErrorScreen({ title, body }: { title: string; body: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <Card className="max-w-md w-full text-center">
        <h1 className="text-2xl font-light mb-3">{title}</h1>
        <p className="text-muted text-sm mb-6">{body}</p>
        <a href="/api/auth/logout">
          <Button variant="secondary" className="w-full">
            Cerrar sesión
          </Button>
        </a>
      </Card>
    </main>
  )
}
