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

const { data: miembros } = await supabase.rpc('list_miembros', { p_tenant_id: TENANT })
const miembro = miembros[0]
console.log('Miembro:', { nombre: miembro.nombre, puntos_actuales: miembro.puntos_actuales, nivel: miembro.nivel })

console.log('\n→ Crear recompensa "Café gratis" 100 puntos')
const r1 = await supabase.rpc('create_recompensa', {
  p_tenant_id: TENANT,
  p_nombre: 'Café gratis',
  p_costo_puntos: 100,
  p_descripcion: 'Cualquier café del menú',
})
console.log({ id: r1.data?.id, nombre: r1.data?.nombre, activa: r1.data?.activa })
const recompensaId = r1.data.id

console.log('\n→ Crear recompensa cara "Botella vino" 5000 puntos')
const r2 = await supabase.rpc('create_recompensa', {
  p_tenant_id: TENANT,
  p_nombre: 'Botella vino',
  p_costo_puntos: 5000,
})
const recompensaCara = r2.data.id

console.log('\n→ Crear recompensa que vamos a desactivar')
const r3 = await supabase.rpc('create_recompensa', {
  p_tenant_id: TENANT,
  p_nombre: 'Test inactiva',
  p_costo_puntos: 50,
})
const recompensaInactiva = r3.data.id

console.log('\n→ Desactivarla con update_recompensa(activa=false)')
const r4 = await supabase.rpc('update_recompensa', {
  p_tenant_id: TENANT,
  p_id: recompensaInactiva,
  p_activa: false,
})
console.log({ activa: r4.data?.activa })

console.log('\n→ list_recompensas (admin: todas)')
const r5 = await supabase.rpc('list_recompensas', { p_tenant_id: TENANT })
console.log(r5.data?.map(r => ({ nombre: r.nombre, costo: r.costo_puntos, activa: r.activa })))

console.log('\n→ list_recompensas_activas (PWA: solo activas)')
const r6 = await supabase.rpc('list_recompensas_activas', { p_tenant_id: TENANT })
console.log(r6.data?.map(r => ({ nombre: r.nombre, costo: r.costo_puntos })))

console.log('\n→ Canje exitoso (Café gratis, 100 < 550)')
const c1 = await supabase.rpc('register_canje', {
  p_tenant_id: TENANT,
  p_miembro_id: miembro.id,
  p_recompensa_id: recompensaId,
})
console.log({
  puntos_actuales: c1.data?.miembro?.puntos_actuales,
  puntos_historicos: c1.data?.miembro?.puntos_historicos,
  nivel: c1.data?.miembro?.nivel,
  delta: c1.data?.transaccion?.puntos_delta,
  nota: c1.data?.transaccion?.nota,
})

console.log('\n→ Canje sin puntos suficientes (Botella vino, 5000 > 450)')
const c2 = await supabase.rpc('register_canje', {
  p_tenant_id: TENANT,
  p_miembro_id: miembro.id,
  p_recompensa_id: recompensaCara,
})
console.log('error:', c2.error?.message)

console.log('\n→ Canje contra recompensa inactiva')
const c3 = await supabase.rpc('register_canje', {
  p_tenant_id: TENANT,
  p_miembro_id: miembro.id,
  p_recompensa_id: recompensaInactiva,
})
console.log('error:', c3.error?.message)

console.log('\n→ Canje con recompensa inexistente')
const c4 = await supabase.rpc('register_canje', {
  p_tenant_id: TENANT,
  p_miembro_id: miembro.id,
  p_recompensa_id: '00000000-0000-0000-0000-000000000000',
})
console.log('error:', c4.error?.message)
