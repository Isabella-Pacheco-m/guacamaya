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

const tables = await client.query(`
  select table_name
  from information_schema.tables
  where table_schema = 'public' and table_type = 'BASE TABLE'
  order by table_name
`)

console.log('Tablas en schema public:')
if (tables.rows.length === 0) {
  console.log('  (vacío)')
} else {
  for (const { table_name } of tables.rows) {
    const safe = table_name.replace(/"/g, '""')
    const c = await client.query(`select count(*)::int as n from public."${safe}"`)
    console.log(`  ${table_name.padEnd(28)} ${c.rows[0].n.toString().padStart(8)} filas`)
  }
}

const fns = await client.query(`
  select routine_name
  from information_schema.routines
  where routine_schema = 'public'
  order by routine_name
`)
console.log('\nFunciones en schema public:')
if (fns.rows.length === 0) console.log('  (vacío)')
else for (const { routine_name } of fns.rows) console.log(`  ${routine_name}`)

await client.end()
