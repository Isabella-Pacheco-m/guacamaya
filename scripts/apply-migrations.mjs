import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import pg from 'pg'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

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

const migrationsDir = join(root, 'supabase', 'migrations')
const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort()

if (files.length === 0) {
  console.log('No hay migraciones para aplicar.')
  process.exit(0)
}

// Para DDL preferimos session mode (5432) en vez de transaction mode (6543).
const sessionUrl = env.SUPABASE_URL.replace(':6543/', ':5432/')
const client = new pg.Client({
  connectionString: sessionUrl,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
  query_timeout: 30000,
})
await client.connect()

await client.query(`
  create table if not exists _migrations (
    name       text primary key,
    applied_at timestamptz not null default now()
  )
`)

const { rowCount: tenantsExists } = await client.query(`
  select 1 from information_schema.tables
  where table_schema = 'public' and table_name = 'tenants'
`)
const { rowCount: trackerHasRows } = await client.query(
  'select 1 from _migrations limit 1'
)
if (tenantsExists && !trackerHasRows && files.includes('0001_init.sql')) {
  await client.query(
    "insert into _migrations(name) values ('0001_init.sql') on conflict do nothing"
  )
  console.log('Seed: 0001_init.sql marcada como ya aplicada.')
}

const applied = new Set(
  (await client.query('select name from _migrations')).rows.map((r) => r.name)
)

let aplicadas = 0
for (const file of files) {
  if (applied.has(file)) {
    console.log(`Skip ${file} (ya aplicada)`)
    continue
  }
  const sql = readFileSync(join(migrationsDir, file), 'utf8')
  process.stdout.write(`Aplicando ${file} (${sql.length} bytes)... `)
  try {
    await client.query('begin')
    await client.query(sql)
    await client.query('insert into _migrations(name) values ($1)', [file])
    await client.query('commit')
    console.log('OK')
    aplicadas++
  } catch (err) {
    await client.query('rollback').catch(() => {})
    console.log('FALLÓ')
    console.error(err.message)
    await client.end()
    process.exit(1)
  }
}

await client.end()
console.log(`\n${aplicadas} migración(es) aplicada(s).`)
