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
