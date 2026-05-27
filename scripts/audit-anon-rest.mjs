// AUDITORÍA REST (solo lectura) — atacante con anon key PÚBLICA vs PostgREST.
// Prueba executabilidad + fuga real usando métricas (agregados, sin exponer PII).
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const env = Object.fromEntries(
  readFileSync(resolve(__dirname, '..', '.env'), 'utf8')
    .split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)] })
)
const projectUrl = `https://${env.SUPABASE_PROJECTID}.supabase.co`
const anon = env.SUPABASE_ANON_PUBLIC
const H = { apikey: anon, Authorization: `Bearer ${anon}`, 'Content-Type': 'application/json' }

async function rpc(fn, body) {
  const res = await fetch(`${projectUrl}/rest/v1/rpc/${fn}`, { method: 'POST', headers: H, body: JSON.stringify(body) })
  return { status: res.status, txt: await res.text() }
}

const tRes = await fetch(`${projectUrl}/rest/v1/tenants?select=id,slug`, { headers: H })
const tenants = JSON.parse(await tRes.text())
console.log(`Rol anon (key pública), sin sesión. Tenants visibles: ${tenants.map(t=>t.slug).join(', ')}\n`)

for (const t of tenants) {
  const met = await rpc('get_metricas_resumen', { p_tenant_id: t.id, p_dias: 3650 })
  const mem = await rpc('list_miembros', { p_tenant_id: t.id })
  const rec = await rpc('list_recompensas_activas', { p_tenant_id: t.id })
  let memN = 'n/a', recN = 'n/a', metObj = null
  try { const a = JSON.parse(mem.txt); memN = Array.isArray(a) ? a.length : 'n/a' } catch {}
  try { const a = JSON.parse(rec.txt); recN = Array.isArray(a) ? a.length : 'n/a' } catch {}
  try { metObj = JSON.parse(met.txt) } catch {}
  console.log(`tenant "${t.slug}":`)
  console.log(`  get_metricas_resumen -> HTTP ${met.status} ${metObj ? JSON.stringify(metObj) : met.txt.slice(0,120)}`)
  console.log(`  list_miembros        -> HTTP ${mem.status}, filas=${memN}`)
  console.log(`  list_recompensas_act -> HTTP ${rec.status}, filas=${recN}`)
}
