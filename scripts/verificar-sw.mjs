// scripts/verificar-sw.mjs — comprobar que el service worker de un despliegue
// PUEDE instalarse.
//
//   node scripts/verificar-sw.mjs https://coffeehaus.guacamaya.net
//
// Por qué existe: Workbox descarga todas las URLs del precaché durante el
// evento `install`. Si UNA sola responde algo distinto de 200, la instalación
// aborta y el service worker no se activa nunca. Y un worker que no se activa
// no es un fallo ruidoso: la web sigue funcionando, el registro parece
// correcto, y lo único que desaparece —sin un solo error— son las
// notificaciones push y el modo offline.
//
// Así se perdieron días persiguiendo un supuesto problema de push: el culpable
// era `/_next/app-build-manifest.json`, un artefacto interno del App Router
// que next-pwa metía en el precaché y que Next.js no sirve en producción.
//
// Correr esto después de cada despliegue que toque next.config.js, el
// precaché o la versión de next/next-pwa.

const base = (process.argv[2] ?? '').replace(/\/$/, '')

if (!base.startsWith('http')) {
  console.error('\nUso: node scripts/verificar-sw.mjs https://<host>\n')
  process.exit(1)
}

const fallo = (msg) => {
  console.error(`\n✗ ${msg}\n`)
  process.exit(1)
}

const swRes = await fetch(`${base}/sw.js`)
if (!swRes.ok) {
  fallo(`${base}/sw.js responde ${swRes.status}: no hay service worker que instalar.`)
}
const sw = await swRes.text()

// Los scripts importados se evalúan antes que nada: si uno falla, el worker
// muere ahí mismo.
const imports = [...sw.matchAll(/importScripts\(\s*"([^"]+)"/g)].map((m) => m[1])
// El manifiesto de precaché que genera Workbox.
const precache = [
  ...sw.matchAll(/\{url:"([^"]+)",revision:("[^"]*"|null)\}/g),
].map((m) => m[1])

console.log(`\nService worker de ${base}`)
console.log(`  scripts importados : ${imports.length}`)
console.log(`  URLs en el precaché: ${precache.length}\n`)

if (precache.length === 0) {
  console.warn('  (sin precaché — ¿el build de PWA corrió?)\n')
}

async function comprobar(url) {
  const absoluta = url.startsWith('http') ? url : `${base}${url.startsWith('/') ? '' : '/'}${url}`
  try {
    const res = await fetch(absoluta, { redirect: 'manual' })
    return { url, status: res.status, ok: res.status === 200 }
  } catch (e) {
    return { url, status: e.message.slice(0, 40), ok: false }
  }
}

// De a poco, para no dispararle 80 peticiones simultáneas al CDN.
const malas = []
const todas = [...imports, ...precache]
for (let i = 0; i < todas.length; i += 12) {
  const lote = await Promise.all(todas.slice(i, i + 12).map(comprobar))
  for (const r of lote) if (!r.ok) malas.push(r)
  process.stdout.write(`\r  comprobadas ${Math.min(i + 12, todas.length)}/${todas.length}`)
}
process.stdout.write('\r'.padEnd(40) + '\r')

if (malas.length === 0) {
  console.log('✓ Todas responden 200: el service worker puede instalarse.\n')
  process.exit(0)
}

console.error(`✗ ${malas.length} URL(s) rotas — el service worker NO se instalará:\n`)
for (const m of malas) console.error(`    ${m.status}  ${m.url}`)
console.error(
  '\nMientras esto siga así no hay notificaciones push ni offline en NINGÚN\n' +
    'dispositivo. Excluye esas rutas del precaché con `buildExcludes` en\n' +
    'next.config.js (ahí está el ejemplo de app-build-manifest.json).\n'
)
process.exit(1)
