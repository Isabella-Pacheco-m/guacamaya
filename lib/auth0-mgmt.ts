// Cliente del Auth0 Management API.
//
// Obtiene un access_token vía client_credentials grant (M2M app aparte) y
// lo cachea en memoria del proceso hasta cerca de la expiración. La M2M
// app debe tener autorizados los scopes `read:users` y `update:users`.
//
// Vars requeridas:
//   AUTH0_DOMAIN              p.ej. dev-ky8admxk1prdjexa.us.auth0.com
//   AUTH0_M2M_CLIENT_ID       client_id de la M2M app
//   AUTH0_M2M_CLIENT_SECRET   client_secret de la M2M app

interface CachedToken {
  access_token: string
  expires_at: number // ms epoch
}

let cached: CachedToken | null = null

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Falta variable de entorno ${name}`)
  return v
}

async function fetchAccessToken(): Promise<CachedToken> {
  const domain = requireEnv('AUTH0_DOMAIN')
  const clientId = requireEnv('AUTH0_M2M_CLIENT_ID')
  const clientSecret = requireEnv('AUTH0_M2M_CLIENT_SECRET')
  const audience = `https://${domain}/api/v2/`

  const res = await fetch(`https://${domain}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      audience,
    }),
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Auth0 token request falló: ${res.status} ${body}`)
  }

  const data = (await res.json()) as {
    access_token: string
    expires_in: number
  }

  return {
    access_token: data.access_token,
    // Renovamos 60s antes de que expire para evitar usar uno caducado.
    expires_at: Date.now() + (data.expires_in - 60) * 1000,
  }
}

async function getAccessToken(): Promise<string> {
  if (cached && cached.expires_at > Date.now()) {
    return cached.access_token
  }
  cached = await fetchAccessToken()
  return cached.access_token
}

export class Auth0MgmtError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
    this.name = 'Auth0MgmtError'
  }
}

interface UserAppMetadata {
  tenantId?: string
  miembroId?: string
}

interface User {
  user_id: string
  email?: string
  email_verified?: boolean
  app_metadata?: UserAppMetadata
}

export async function getUser(auth0UserId: string): Promise<User> {
  const domain = requireEnv('AUTH0_DOMAIN')
  const token = await getAccessToken()
  const url = `https://${domain}/api/v2/users/${encodeURIComponent(auth0UserId)}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Auth0MgmtError(
      `Auth0 getUser falló: ${res.status} ${body}`,
      res.status
    )
  }
  return (await res.json()) as User
}

/**
 * Mergea (no sobrescribe el resto) `app_metadata` del usuario en Auth0.
 * Auth0 acepta merge nativo en PATCH cuando se envía solo el subset de
 * keys a actualizar.
 *
 * Idempotente: si la key ya tiene el mismo valor, no hace daño.
 */
export async function patchAppMetadata(
  auth0UserId: string,
  patch: UserAppMetadata
): Promise<User> {
  const domain = requireEnv('AUTH0_DOMAIN')
  const token = await getAccessToken()
  const url = `https://${domain}/api/v2/users/${encodeURIComponent(auth0UserId)}`
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ app_metadata: patch }),
    cache: 'no-store',
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Auth0MgmtError(
      `Auth0 patchAppMetadata falló: ${res.status} ${body}`,
      res.status
    )
  }
  return (await res.json()) as User
}
