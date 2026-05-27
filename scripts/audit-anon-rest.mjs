// Verificación (solo lectura) — simula a un atacante con la anon key PÚBLICA
// llamando PostgREST sin sesión. Tras la migración 0020, TODO debe dar 401.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const env = Object.fromEntries(
  readFileSync(resolve(__dirname, '..', '.env'), 'utf8')
    .split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')] })
)
const url = `https://${env.SUPABASE_PROJECTID}.supabase.co`
const anon = env.SUPABASE_ANON_PUBLIC
const H = { apikey: anon, Authorization: `Bearer ${anon}`, 'Content-Type': 'application/json' }
const FAKE = '00000000-0000-0000-0000-000000000000'

const checks = [
  ['GET  /tenants',            () => fetch(`${url}/rest/v1/tenants?select=id&limit=1`, { headers: H })],
  ['GET  /admin_invitations',  () => fetch(`${url}/rest/v1/admin_invitations?select=email&limit=1`, { headers: H })],
  ['GET  /tenant_features',    () => fetch(`${url}/rest/v1/tenant_features?select=tenant_id&limit=1`, { headers: H })],
  ['GET  /tarjeta_premios',    () => fetch(`${url}/rest/v1/tarjeta_premios?select=tenant_id&limit=1`, { headers: H })],
  ['POST /rpc/list_miembros',  () => fetch(`${url}/rest/v1/rpc/list_miembros`, { method: 'POST', headers: H, body: JSON.stringify({ p_tenant_id: FAKE }) })],
  ['POST /rpc/get_metricas',   () => fetch(`${url}/rest/v1/rpc/get_metricas_resumen`, { method: 'POST', headers: H, body: JSON.stringify({ p_tenant_id: FAKE, p_dias: 30 }) })],
  ['POST /rpc/register_compra',() => fetch(`${url}/rest/v1/rpc/register_compra`, { method: 'POST', headers: H, body: JSON.stringify({ p_tenant_id: FAKE, p_miembro_id: FAKE, p_monto_cop: 1 }) })],
]

console.log('Como anon (key pública), sin sesión. Esperado: 401 DENEGADO en todo.\n')
let expuesto = 0
for (const [label, run] of checks) {
  const r = await run()
  const ok = r.status === 401 || r.status === 403
  if (!ok) expuesto++
  console.log(`  ${label.padEnd(26)} HTTP ${r.status}  ${ok ? 'DENEGADO ✓' : '⚠ EXPUESTO'}`)
}
console.log(expuesto === 0 ? '\n✓ Cierre confirmado: anon no accede a nada.' : `\n⚠ ${expuesto} endpoint(s) aún accesibles — revisar 0020.`)
process.exit(expuesto === 0 ? 0 : 1)
