const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
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
