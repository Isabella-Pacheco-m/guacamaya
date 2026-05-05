// Rutas con sesión que NUNCA deben servirse desde el service worker:
// servir HTML cacheado de un usuario logueado a otro (o post-logout)
// rompe la auth y filtra contenido. Para esos paths siempre red, sin caché.
const NETWORK_ONLY_PATHS = /^\/(api|admin|superadmin|claim)(\/|$)/

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
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_PUBLIC,
    AUTH0_ISSUER_BASE_URL: process.env.AUTH0_DOMAIN
      ? `https://${process.env.AUTH0_DOMAIN}`
      : '',
  },
}

module.exports = withPWA(nextConfig)
