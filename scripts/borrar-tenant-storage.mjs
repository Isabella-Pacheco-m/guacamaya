// borrar-tenant-storage.mjs — borra los archivos de un tenant en el bucket
// `business_media` (logo, banner, sello, feed, galería, sorteos, retos,
// lanzamientos y avatares: todo cuelga de tenants/<id>/).
//
// Va aparte del SQL porque Supabase protege storage.objects con un trigger
// (storage.protect_delete): un `delete from storage.objects` falla con
// "Direct deletion from storage tables is not allowed". Hay que pasar por la
// Storage API, que es lo que hace este script con el service role.
//
// Uso:
//   node scripts/borrar-tenant-storage.mjs burger-house            (dry-run)
//   node scripts/borrar-tenant-storage.mjs burger-house --confirm  (borra)
//
// Correr ANTES del SQL: necesita el tenant en la DB para resolver su id.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// El .env del repo puede venir con los valores vacíos (los secretos viven en
// Vercel), así que lo que ya esté en el entorno manda:
//   SUPABASE_PROJECTID=xxx SUPABASE_SERVICE_ROLE=yyy node scripts/...
function leerEnv() {
  let delArchivo = {}
  try {
    delArchivo = Object.fromEntries(
      readFileSync(resolve(__dirname, '..', '.env'), 'utf8')
        .split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
        .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)] })
        .filter(([, v]) => v !== '')
    )
  } catch {
    // sin .env: se usa solo el entorno
  }
  return { ...delArchivo, ...process.env }
}
const env = leerEnv()

const BUCKET = 'business_media'
const slug = process.argv[2]
const confirm = process.argv.includes('--confirm')

if (!slug) {
  console.error('Uso: node scripts/borrar-tenant-storage.mjs <slug> [--confirm]')
  process.exit(1)
}

const proyecto = env.SUPABASE_PROJECTID
const serviceRole = env.SUPABASE_SERVICE_ROLE
if (!proyecto || !serviceRole) {
  console.error(
    'Faltan credenciales. El .env local las trae vacías: pásalas en línea\n' +
    '  SUPABASE_PROJECTID=<id> SUPABASE_SERVICE_ROLE=<key> \\\n' +
    `    node scripts/borrar-tenant-storage.mjs ${slug}\n` +
    '(Vercel → Settings → Environment Variables, o Supabase → Project Settings\n' +
    ' → API. Alternativa sin script: Dashboard → Storage → business_media →\n' +
    ' carpeta tenants/<id> → Delete.)'
  )
  process.exit(1)
}

const sb = createClient(`https://${proyecto}.supabase.co`, serviceRole)

const { data: tenant, error: tErr } = await sb
  .from('tenants')
  .select('id, nombre, slug')
  .eq('slug', slug)
  .maybeSingle()

if (tErr) { console.error(tErr); process.exit(1) }
if (!tenant) {
  console.error(`No existe un tenant con slug '${slug}'.`)
  process.exit(1)
}

// list() no es recursivo: devuelve archivos y "carpetas" (entradas sin id).
async function listarTodo(prefix) {
  const out = []
  let offset = 0
  for (;;) {
    const { data, error } = await sb.storage
      .from(BUCKET)
      .list(prefix, { limit: 100, offset })
    if (error) throw error
    if (!data.length) break
    for (const entry of data) {
      const path = `${prefix}/${entry.name}`
      if (entry.id === null) out.push(...(await listarTodo(path)))
      else out.push(path)
    }
    if (data.length < 100) break
    offset += data.length
  }
  return out
}

const raiz = `tenants/${tenant.id}`
const paths = await listarTodo(raiz)

console.log(`Tenant: ${tenant.nombre} (${tenant.slug})`)
console.log(`Archivos bajo ${raiz}/: ${paths.length}`)
for (const p of paths) console.log('  ', p)

if (!paths.length) {
  console.log('Nada que borrar.')
  process.exit(0)
}

if (!confirm) {
  console.log('\nDry-run. Repite el comando con --confirm para borrarlos.')
  process.exit(0)
}

// remove() acepta hasta cierta cantidad de rutas por llamada; en lotes de 100.
for (let i = 0; i < paths.length; i += 100) {
  const lote = paths.slice(i, i + 100)
  const { error } = await sb.storage.from(BUCKET).remove(lote)
  if (error) { console.error(error); process.exit(1) }
  console.log(`Borrados ${Math.min(i + 100, paths.length)}/${paths.length}`)
}

const restantes = await listarTodo(raiz)
console.log(
  restantes.length === 0
    ? 'Listo: no quedan archivos del tenant.'
    : `⚠️  Quedaron ${restantes.length} archivos sin borrar.`
)
