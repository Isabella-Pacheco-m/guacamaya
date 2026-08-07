const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

// El worker de push es un archivo estático de /public (ver public/push-sw.js:
// ahí está el porqué). Se enlaza con un hash de su contenido en la query para
// que un navegador con el service worker viejo en caché no siga importando
// una copia obsoleta: si el archivo cambia, cambia la URL.
function pushWorkerUrl() {
  const file = path.join(__dirname, 'public', 'push-sw.js')
  const hash = crypto
    .createHash('sha256')
    .update(fs.readFileSync(file))
    .digest('hex')
    .slice(0, 12)
  return `/push-sw.js?v=${hash}`
}

// Rutas con sesión que NUNCA deben servirse desde el service worker:
// servir HTML cacheado de un usuario logueado a otro (o post-logout)
// rompe la auth y filtra contenido. Para esos paths siempre red, sin caché.
const NETWORK_ONLY_PATHS = /^\/(api|admin|admin-claim|superadmin)(\/|$)/

// Headers de seguridad aplicados a todas las respuestas.
const SECURITY_HEADERS = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
]

const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  // Handlers de push/notificationclick/pushsubscriptionchange. Enlace
  // síncrono y verificable, en vez del custom worker de next-pwa (que se
  // compila en paralelo sin esperarse y puede faltar en el deploy).
  importScripts: [pushWorkerUrl()],
  // ⚠️ NO QUITAR: esto es lo que impedía que el service worker existiera.
  //
  // Workbox descarga TODO el precaché durante el `install`; si una sola URL
  // responde 404, la instalación aborta y el worker no se activa nunca. Y
  // `app-build-manifest.json` es un artefacto interno del App Router que
  // Next.js NO sirve en producción, así que daba 404 siempre.
  //
  // next-pwa v5 ya excluye `build-manifest.json` y
  // `react-loadable-manifest.json`, pero es de la época del Pages Router y no
  // conoce la variante `app-`. Resultado: el worker se registraba, fallaba al
  // instalarse y se quedaba muerto — en todos los navegadores y dispositivos.
  // Desde fuera parecía un problema de notificaciones push.
  //
  // Antes de tocar el precaché, comprobar que todas sus URLs responden 200
  // (se extraen del sw.js generado).
  buildExcludes: [/app-build-manifest\.json$/],
  // El worker no es un asset de la app: se carga por importScripts con su
  // hash, no hace falta que además viva en el precaché.
  publicExcludes: ['!noprecache/**/*', '!push-sw.js'],
  runtimeCaching: [
    {
      urlPattern: NETWORK_ONLY_PATHS,
      handler: 'NetworkOnly',
    },
    {
      urlPattern: /\.(?:js|css|woff2?|ttf|eot)$/i,
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'static-assets' },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'images' },
    },
    {
      urlPattern: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts',
        expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
      },
    },
  ],
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.SUPABASE_PROJECTID
      ? `https://${process.env.SUPABASE_PROJECTID}.supabase.co`
      : '',
    // La anon key NO se expone: el browser nunca habla con Supabase directo
    // (todo pasa por las API routes con service role) y 0020 le revocó los
    // permisos a anon. Inyectarla al bundle era superficie gratuita.
    AUTH0_ISSUER_BASE_URL: process.env.AUTH0_DOMAIN
      ? `https://${process.env.AUTH0_DOMAIN}`
      : '',
  },
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }]
  },
}

module.exports = withPWA(nextConfig)
