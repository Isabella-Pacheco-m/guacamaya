import { handleAuth, handleLogin } from '@auth0/nextjs-auth0'

// El callback de Auth0 siempre aterriza en el apex (AUTH0_BASE_URL), aunque el
// login se inicie en el subdominio de un tenant. Sin más contexto, una cuenta
// nueva quedaba varada en guacamaya.net "sin tenant". Por eso el returnTo por
// defecto lleva el slug del host de origen (/?join=slug): el apex lo usa para
// vincular la cuenta con ese club y devolverla a su subdominio.
// Un ?returnTo= explícito en la query (invitaciones, deep-links de los guards)
// sigue mandando: el SDK lo aplica por encima de esta opción.
export const GET = handleAuth({
  login: handleLogin((req) => {
    // App Router: req es NextRequest y el middleware ya dejó el slug del host.
    const slug =
      req instanceof Request ? req.headers.get('x-tenant-slug') ?? '' : ''
    return slug ? { returnTo: `/?join=${encodeURIComponent(slug)}` } : {}
  }),
})
