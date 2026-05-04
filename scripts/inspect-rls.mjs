import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import pg from 'pg'

const __dirname = dirname(fileURLToPath(import.meta.url))
const env = Object.fromEntries(
  readFileSync(resolve(__dirname, '..', '.env'), 'utf8')
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

const rls = await client.query(`
  select c.relname as table, c.relrowsecurity as rls_enabled
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
  order by c.relname
`)
console.log('RLS por tabla:')
for (const r of rls.rows) console.log(`  ${r.table.padEnd(16)} ${r.rls_enabled ? 'ON' : 'off'}`)

const pol = await client.query(`
  select tablename, policyname, qual
  from pg_policies
  where schemaname = 'public'
  order by tablename, policyname
`)
console.log('\nPolíticas:')
for (const p of pol.rows) console.log(`  ${p.tablename}.${p.policyname}: ${p.qual}`)

await client.end()
