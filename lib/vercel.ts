import { PUBLIC_ROOT_HOST } from '@/lib/config'

// Integración con Vercel API para registrar el subdominio de cada tenant.
//
// Por qué: Vercel solo emite cert SSL para `*.guacamaya.net` (wildcard) si
// controla el DNS (ACME DNS-01 challenge). Como el DNS lo lleva Cloudflare,
// hay que registrar cada subdominio individualmente — Vercel valida con
// HTTP-01 sobre el CNAME wildcard que ya existe (`*` -> `cname.vercel-dns.com`).
//
// Ref: https://vercel.com/docs/rest-api/endpoints/projects#add-a-domain-to-a-project

export type RegisterDomainResult =
  | { ok: true; alreadyExisted: boolean }
  | { ok: false; reason: 'missing-config' | 'api-error'; detail?: string }

interface VercelApiError {
  error?: { code?: string; message?: string }
}

export async function registerTenantDomainOnVercel(
  slug: string
): Promise<RegisterDomainResult> {
  const token = process.env.VERCEL_API_TOKEN
  const projectId = process.env.VERCEL_PROJECT_ID
  if (!token || !projectId) {
    return { ok: false, reason: 'missing-config' }
  }

  // El host base puede traer puerto en dev (lvh.me:8080) — no aplica acá
  // porque la integración con Vercel solo corre en producción donde es
  // guacamaya.net. Aun así, normalizo por seguridad.
  const baseHost = PUBLIC_ROOT_HOST.split(':')[0]
  const name = `${slug}.${baseHost}`

  const teamId = process.env.VERCEL_TEAM_ID
  const url = teamId
    ? `https://api.vercel.com/v10/projects/${projectId}/domains?teamId=${teamId}`
    : `https://api.vercel.com/v10/projects/${projectId}/domains`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
    cache: 'no-store',
  })

  if (res.ok) {
    return { ok: true, alreadyExisted: false }
  }

  // 409 con code domain_already_in_use significa que ya estaba registrado
  // en este mismo proyecto — eso para nosotros es éxito (idempotencia).
  let body: VercelApiError | null = null
  try {
    body = (await res.json()) as VercelApiError
  } catch {
    // ignore
  }
  const code = body?.error?.code ?? ''
  if (res.status === 409 && code === 'domain_already_in_use') {
    return { ok: true, alreadyExisted: true }
  }
  const detail =
    body?.error?.message ?? `HTTP ${res.status}${code ? ` (${code})` : ''}`
  console.error('[vercel] registerTenantDomain failed', { slug, status: res.status, code, detail })
  return { ok: false, reason: 'api-error', detail }
}
