// Host público para construir URLs de tenants ({slug}.{host}).
// Dev: lvh.me:8080 (resuelve a 127.0.0.1 sin /etc/hosts).
// Prod: guacamaya.co (cuando exista).
export const PUBLIC_ROOT_HOST =
  process.env.PUBLIC_ROOT_HOST ?? 'lvh.me:8080'

export const PUBLIC_ROOT_PROTOCOL =
  process.env.PUBLIC_ROOT_PROTOCOL ?? 'http'

export function tenantBaseUrl(slug: string): string {
  return `${PUBLIC_ROOT_PROTOCOL}://${slug}.${PUBLIC_ROOT_HOST}`
}

// Base de auth (= AUTH0_BASE_URL). Las invitaciones se sirven desde aquí
// para evitar cross-origin con la cookie de estado del SDK de Auth0.
export const AUTH_BASE_URL =
  process.env.AUTH0_BASE_URL ?? 'http://localhost:8080'

export function inviteUrl(token: string): string {
  return `${AUTH_BASE_URL}/invite/${token}`
}

// Onboarding del primer admin de un tenant nuevo. Vive en el host raíz
// (mismo origen que el callback de Auth0) — el tenant se resuelve del
// token, no del subdominio.
export function adminClaimUrl(token: string): string {
  return `${AUTH_BASE_URL}/admin-claim/${token}`
}

// URL que el QR del cliente codifica. Apunta al root host (ahí vive el admin)
// con miembro_id y recompensa_id en query — el admin escanea con la cámara
// del teléfono y abre directamente la pantalla de confirmación.
export function canjeQuickUrl(miembroId: string, recompensaId: string): string {
  const params = new URLSearchParams({ m: miembroId, r: recompensaId })
  return `${AUTH_BASE_URL}/admin/canjes/confirmar?${params.toString()}`
}
