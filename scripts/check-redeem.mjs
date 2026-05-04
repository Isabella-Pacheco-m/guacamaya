import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import pg from 'pg'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '..', '.env')
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i), l.slice(i + 1)]
    })
)

const client = new pg.Client({ connectionString: env.SUPABASE_URL })
await client.connect()

const inv = await client.query(`
  select id, tenant_id, miembro_id, expires_at, used_at, used_by_auth0_user_id
  from invitaciones
  order by created_at desc
  limit 5
`)
console.log('Últimas invitaciones:')
console.table(inv.rows)

const m = await client.query(`
  select id, tenant_id, nombre, auth0_user_id, telefono, email
  from miembros
  where auth0_user_id is not null
  order by created_at desc
  limit 10
`)
console.log('\nMiembros con auth0_user_id:')
console.table(m.rows)

await client.end()
