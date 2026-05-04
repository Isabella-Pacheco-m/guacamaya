import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const env = Object.fromEntries(
  readFileSync(resolve(__dirname, '..', '.env'), 'utf8')
    .split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)] })
)
const url = `https://${env.SUPABASE_PROJECTID}.supabase.co`
const sb = createClient(url, env.SUPABASE_SERVICE_ROLE)
const { data, error } = await sb.from('tenants').select('slug, nombre, id').limit(10)
if (error) { console.error(error); process.exit(1) }
console.log(JSON.stringify(data, null, 2))
