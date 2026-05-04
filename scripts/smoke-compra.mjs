import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const env = Object.fromEntries(
  readFileSync(resolve(root, '.env'), 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i), l.slice(i + 1)]
    })
)

const url = `https://${env.SUPABASE_PROJECTID}.supabase.co`
const supabase = createClient(url, env.SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const TENANT = '661dfbb3-f946-48ce-b349-76744f6d7293'

const list = await supabase.rpc('list_miembros', { p_tenant_id: TENANT })
const miembro = list.data?.[0]
if (!miembro) {
  console.error('No hay miembros para probar')
  process.exit(1)
}
console.log('Miembro inicial:', {
  nombre: miembro.nombre,
  puntos_actuales: miembro.puntos_actuales,
  puntos_historicos: miembro.puntos_historicos,
  nivel: miembro.nivel,
})

console.log('\n→ Compra COP 50.000 (esperado: 50 puntos, sigue BRONCE)')
const c1 = await supabase.rpc('register_compra', {
  p_tenant_id: TENANT,
  p_miembro_id: miembro.id,
  p_monto_cop: 50000,
})
console.log('miembro:', c1.data?.miembro && {
  puntos_actuales: c1.data.miembro.puntos_actuales,
  puntos_historicos: c1.data.miembro.puntos_historicos,
  nivel: c1.data.miembro.nivel,
})
console.log('transaccion:', c1.data?.transaccion && {
  tipo: c1.data.transaccion.tipo,
  monto_cop: c1.data.transaccion.monto_cop,
  puntos_delta: c1.data.transaccion.puntos_delta,
})

console.log('\n→ Compra COP 500.000 (esperado: +500 puntos, sube a PLATA)')
const c2 = await supabase.rpc('register_compra', {
  p_tenant_id: TENANT,
  p_miembro_id: miembro.id,
  p_monto_cop: 500000,
})
console.log('miembro:', c2.data?.miembro && {
  puntos_actuales: c2.data.miembro.puntos_actuales,
  puntos_historicos: c2.data.miembro.puntos_historicos,
  nivel: c2.data.miembro.nivel,
})

console.log('\n→ Compra con monto 0 (debe fallar)')
const c3 = await supabase.rpc('register_compra', {
  p_tenant_id: TENANT,
  p_miembro_id: miembro.id,
  p_monto_cop: 0,
})
console.log('error:', c3.error?.message)

console.log('\n→ Compra con miembro inexistente (debe fallar)')
const c4 = await supabase.rpc('register_compra', {
  p_tenant_id: TENANT,
  p_miembro_id: '00000000-0000-0000-0000-000000000000',
  p_monto_cop: 10000,
})
console.log('error:', c4.error?.message)
