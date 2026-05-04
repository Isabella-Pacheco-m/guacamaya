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

console.log('→ list_miembros (esperado: array vacío)')
const r1 = await supabase.rpc('list_miembros', { p_tenant_id: TENANT })
console.log(r1)

console.log('\n→ create_miembro')
const r2 = await supabase.rpc('create_miembro', {
  p_tenant_id: TENANT,
  p_nombre: 'María Test',
  p_telefono: '573001234567',
  p_email: 'maria@test.co',
})
console.log(r2)

console.log('\n→ list_miembros (esperado: 1 row)')
const r3 = await supabase.rpc('list_miembros', { p_tenant_id: TENANT })
console.log(r3)
