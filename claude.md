# CLAUDE.md — Guacamaya · Club de miembros (PWA) · Next.js 14 + TypeScript

## Qué construimos

**Guacamaya** es un SaaS multi-tenant que permite a negocios colombianos crear su propio
club de miembros con marca propia. Cada negocio obtiene una PWA en `{slug}.guacamaya.net`.
Los clientes acumulan puntos, suben de nivel y canjean recompensas.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 14 (App Router) |
| Lenguaje | TypeScript (`strict: true`) |
| Estilos | Tailwind CSS + variables CSS del design system |
| Fuente | Manrope (Google Fonts) |
| PWA | `next-pwa` |
| Auth | Auth0 (`@auth0/nextjs-auth0`) — tenant existente |
| Base de datos | Supabase — proyecto existente |
| Storage | Supabase Storage — buckets existentes |
| Queries | `@supabase/supabase-js` (sin Prisma) |
| Infra | Vercel + Cloudflare wildcard DNS |

---

## Design system

### Tipografía — Manrope

```css
/* globals.css */
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700&display=swap');

:root {
  --font-base: 'Manrope', sans-serif;
}

body {
  font-family: var(--font-base);
  font-size: 16px;
  line-height: 1.6;
  color: var(--color-graphite);
}
```

| Rol | Tamaño | Peso | Uso |
|-----|--------|------|-----|
| Display | 64px | 300 | Hero de la PWA |
| Heading | 40px | 400 | Títulos de sección |
| Subheading | 24px | 400 | Subtítulos, tarjetas |
| Body | 16px | 400 | Texto general |
| Label | 14px | 500 | Etiquetas, botones |
| Caption | 12px | 400 | Textos auxiliares |

### Paleta de colores

```css
:root {
  --color-graphite:     #2A2320; /* Espresso   — fondo oscuro, textos principales   */
  --color-lime:         #EBBA4F; /* Sol        — CTA principal, acentos activos     */
  --color-electric:     #C2603C; /* Terracota  — links, estados, información        */
  --color-sky:          #D89B7A; /* Arcilla    — estados secundarios, hover         */
  --color-surface:      #F3EEE5; /* Crema      — fondo general de la app            */
  --color-white:        #FCFAF6; /* Blanco papel — tarjetas sobre el crema          */
  --color-border:       #E3DACB; /* Arena                                           */
  --color-text-muted:   #736658; /* Taupe                                           */
}
```

> **Nota sobre los nombres de token.** La marca pasó a una paleta *cozy* (beige
> cálido). Los NOMBRES `graphite` / `lime` / `sky` se conservaron porque están
> usados en ~300 sitios; lo que cambió son sus VALORES. Léelos como
> **espresso**, **sol** y **arcilla**. Si algún día se renombran, hacerlo de una
> sola vez en `globals.css`, `tailwind.config.ts` y los usos.

### Tokens de espacio y forma

```css
:root {
  --radius-sm:   8px;
  --radius-md:   16px;
  --radius-lg:   24px;
  --radius-full: 9999px;
  --shadow-card: 0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04);
}
```

### Configuración Tailwind

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'sans-serif'],
      },
      colors: {
        graphite:  '#2A2320', // espresso
        lime:      '#EBBA4F', // sol
        electric:  '#C2603C', // terracota (se sobreescribe por tenant)
        sky:       '#D89B7A', // arcilla
        surface:   '#F3EEE5', // crema
        border:    '#E3DACB', // arena
        muted:     '#736658', // taupe
        white:     '#FCFAF6', // blanco papel
      },
      borderRadius: {
        sm:   '8px',
        md:   '16px',
        lg:   '24px',
      },
    },
  },
}
export default config
```

### Componentes base — patrones visuales

```
Botón primario:   bg-lime text-graphite font-medium rounded-full px-6 py-3
Botón secundario: border border-border text-graphite rounded-full px-6 py-3
Tarjeta:          bg-white rounded-lg shadow-card p-6
Badge nivel:      bg-graphite text-lime rounded-full px-3 py-1 text-sm font-medium
Input:            border border-border rounded-md px-4 py-3 focus:ring-electric
```

### Principios de UI

- Fondo general siempre `--color-surface` (#F3EEE5, crema), nunca blanco puro
- Tipografía ligera (weight 300–400) en displays grandes; nunca bold en headings
- Espaciado generoso — mínimo 24px entre secciones
- Bordes sutiles, sombras cálidas (tinte espresso, nunca negro puro)
- El sol (#EBBA4F) es exclusivo para la acción más importante de cada pantalla
- La terracota (#C2603C) para links, estados activos e información
- Tono *cozy* y auténtico: calidez sobre contraste frío. Fotografía de negocios
  reales en vez de ilustración corporativa. El grano de papel (`.bg-paper`) es
  el acabado artesanal de la marca — usarlo con moderación (hero/landing)

---

## Estructura del proyecto

```
/
├── app/
│   ├── (admin)/          # Panel del negocio
│   │   ├── layout.tsx
│   │   ├── dashboard/
│   │   ├── miembros/
│   │   └── recompensas/
│   ├── (pwa)/            # App del cliente final
│   │   ├── layout.tsx
│   │   ├── home/
│   │   ├── puntos/
│   │   └── recompensas/
│   └── api/
│       ├── tenant/
│       ├── miembros/
│       ├── canjes/
│       ├── recompensas/
│       └── metricas/
├── components/
│   ├── ui/               # Componentes base (Button, Card, Badge, Input)
│   ├── admin/
│   └── pwa/
├── lib/
│   ├── supabase.ts
│   ├── auth0.ts
│   └── business.ts
├── types/index.ts
├── supabase/migrations/
└── public/
    ├── manifest.json
    └── icons/            # Íconos PWA (192x192, 512x512)
```

---

## Auth0

Tenant y aplicaciones ya configurados — no crear nuevos.

```typescript
// lib/auth0.ts
export const NS = 'https://guacamaya.net/'
export const getTenantId  = (t: any): string => t[NS + 'tenantId']
export const getMiembroId = (t: any): string => t[NS + 'miembroId']
```

**Regla:** `tenantId` siempre del JWT. Nunca del body, params ni query string.

### Dev local — Auth0 Application Settings

Dev server corre en `http://localhost:8080` (no 3000). En el dashboard de Auth0
(tenant `dev-ky8admxk1prdjexa`, Application Settings) deben estar registradas:

| Campo | Valor |
|---|---|
| Allowed Callback URLs | `http://localhost:8080/api/auth/callback` |
| Allowed Logout URLs   | `http://localhost:8080` |
| Allowed Web Origins   | `http://localhost:8080` |

Para probar subdominios de tenants en dev (`*.lvh.me:8080`) habrá que añadir
las callbacks correspondientes cuando se necesite multi-tenant end-to-end.

### Custom claims — Auth0 Action requerida

Para que `getTenantId(token)` y `getMiembroId(token)` funcionen, el Login Flow
de Auth0 debe inyectar los claims con namespace `https://guacamaya.net/` en el
ID token:

```javascript
// Auth0 → Actions → Library → Login Flow
exports.onExecutePostLogin = async (event, api) => {
  const NS = 'https://guacamaya.net/'
  const tenantId  = event.user.app_metadata?.tenantId
  const miembroId = event.user.app_metadata?.miembroId
  if (tenantId)  api.idToken.setCustomClaim(NS + 'tenantId',  tenantId)
  if (miembroId) api.idToken.setCustomClaim(NS + 'miembroId', miembroId)
}
```

El Action heredado del MVP Flutter (QueParche) solo agrega `https://supabase.co/jwt`
y no aplica para Guacamaya.

---

## Supabase

Proyecto y buckets existentes. Variables de entorno ya en `.env` — no modificar.

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!   // solo server, nunca al browser
)

export const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

Pasar `tenant_id` antes de cada query con RLS:

```typescript
await supabaseAdmin.rpc('set_config', {
  setting: 'app.tenant_id',
  value: tenantId,
  is_local: true,
})
```

---

## Base de datos

Ejecutar en Supabase Dashboard > SQL Editor.

```sql
create table if not exists tenants (
  id             uuid primary key default gen_random_uuid(),
  nombre         text not null,
  slug           text not null unique,
  logo_url       text,
  color_primario text not null default '#305CFF',
  puntos_por_mil int  not null default 1,
  created_at     timestamptz default now()
);

create table if not exists miembros (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenants(id),
  auth0_user_id     text unique,
  nombre            text not null,
  telefono          text,
  email             text,
  fecha_nacimiento  date,
  puntos_actuales   int not null default 0,
  puntos_historicos int not null default 0,
  nivel             text not null default 'BRONCE',
  created_at        timestamptz default now(),
  unique(tenant_id, telefono)
);

create table if not exists transacciones (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id),
  miembro_id   uuid not null references miembros(id),
  tipo         text not null, -- COMPRA | CANJE | AJUSTE | REGALO | CUMPLEANOS
  monto_cop    int,
  puntos_delta int not null,
  nota         text,
  created_at   timestamptz default now()
);

create table if not exists recompensas (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id),
  nombre       text not null,
  descripcion  text,
  costo_puntos int not null,
  activa       boolean not null default true,
  imagen_url   text,
  created_at   timestamptz default now()
);

alter table miembros      enable row level security;
alter table transacciones enable row level security;
alter table recompensas   enable row level security;

create policy "tenant_isolation" on miembros
  using (tenant_id = (current_setting('app.tenant_id'))::uuid);
create policy "tenant_isolation" on transacciones
  using (tenant_id = (current_setting('app.tenant_id'))::uuid);
create policy "tenant_isolation" on recompensas
  using (tenant_id = (current_setting('app.tenant_id'))::uuid);
```

---

## Tipos compartidos

```typescript
// types/index.ts
export type Nivel = 'BRONCE' | 'PLATA' | 'ORO'
export type TipoTransaccion = 'COMPRA' | 'CANJE' | 'AJUSTE' | 'REGALO' | 'CUMPLEANOS'

export interface Tenant {
  id: string
  nombre: string
  slug: string
  logo_url: string | null
  color_primario: string
  puntos_por_mil: number
}

export interface Miembro {
  id: string
  tenant_id: string
  nombre: string
  telefono: string | null
  email: string | null
  puntos_actuales: number
  puntos_historicos: number
  nivel: Nivel
}

export interface Transaccion {
  id: string
  tenant_id: string
  miembro_id: string
  tipo: TipoTransaccion
  monto_cop: number | null
  puntos_delta: number
  nota: string | null
  created_at: string
}

export interface Recompensa {
  id: string
  tenant_id: string
  nombre: string
  descripcion: string | null
  costo_puntos: number
  activa: boolean
  imagen_url: string | null
}
```

---

## Lógica de negocio

```typescript
// lib/business.ts
import type { Nivel } from '@/types'

const UMBRALES = { PLATA: 500, ORO: 2000 }

export function calcularPuntos(montoCop: number, puntosPorMil: number): number {
  return Math.floor(montoCop / 1000) * puntosPorMil
}

export function calcularNivel(puntosHistoricos: number): Nivel {
  if (puntosHistoricos >= UMBRALES.ORO)   return 'ORO'
  if (puntosHistoricos >= UMBRALES.PLATA) return 'PLATA'
  return 'BRONCE'
}

export function validarCanje(puntosActuales: number, costoPuntos: number): void {
  if (puntosActuales < costoPuntos) throw new Error('Puntos insuficientes')
}
```

---

## Multi-tenancy

```typescript
// middleware.ts — ya creado en el scaffold
// Lee slug del subdominio → header x-tenant-slug

// En Server Components y API routes:
import { headers } from 'next/headers'
const slug = headers().get('x-tenant-slug')
```

### Theming dinámico por tenant

```typescript
// PWA: al montar → GET /api/tenant → { color_primario, logo_url, nombre }
// El color_primario del tenant sobreescribe --color-electric en su PWA
document.documentElement.style.setProperty('--color-electric', tenant.color_primario)
```

---

## API routes

```
GET  /api/tenant                   → datos públicos (por slug)

GET  /api/miembros                 → lista (admin)
POST /api/miembros                 → { nombre, telefono?, email? }
GET  /api/miembros/[id]
POST /api/miembros/[id]/compra     → { monto_cop }

POST /api/canjes                   → { miembro_id, recompensa_id }

GET  /api/recompensas              → lista pública (PWA)
POST /api/recompensas              → (admin)

GET  /api/metricas/resumen         → (admin)
```

`tenant_id` siempre del JWT, nunca del body.

---

## Etapas

### Etapa 1 — MVP
- [ ] Migraciones SQL + RLS en Supabase
- [ ] `/api/tenant` por slug
- [ ] Auth0 login admin + claims
- [ ] Auth0 login cliente PWA
- [ ] CRUD miembros
- [ ] Registro de compra → puntos
- [ ] Lista y canje de recompensas
- [ ] QR para canje en mostrador
- [ ] Panel admin básico
- [ ] PWA instalable (manifest + service worker)
- [ ] Theming dinámico por tenant

### Etapa 2
- [ ] Niveles automáticos (Bronce / Plata / Oro)
- [ ] Historial de transacciones
- [ ] Métricas básicas en el panel
- [ ] Regalo de puntos por cumpleaños (Supabase cron)

### Etapa 3
- [ ] Alertas de clientes inactivos (+30 días)
- [ ] Desafíos y metas mensuales
- [ ] Referidos con link personalizado
- [ ] Notificaciones WhatsApp (solo mensajes, no auth)

---

## Convenciones

- Variables y funciones en **inglés**; UI y comentarios en **español**
- Montos siempre en COP entero — nunca `float` para dinero
- Fechas en UTC en la DB; mostrar en UTC-5 (Colombia) en la UI
- Teléfonos: guardar E.164 (`573001234567`), mostrar como `300 123 4567`
- Lógica de negocio solo en `lib/business.ts` y API routes, nunca en componentes
- Componentes UI base en `components/ui/` — Button, Card, Badge, Input

## Prohibido

- Exponer `SUPABASE_SERVICE_ROLE_KEY` al browser
- Leer `tenantId` del body en rutas protegidas
- Usar `supabaseAdmin` donde debería usarse `supabaseClient`
- Crear tablas o buckets sin una migración SQL en `supabase/migrations/`
- Usar fuentes distintas a Manrope
- Usar blanco puro (`#FFFFFF`) como fondo de página — siempre `--color-surface`
- Usar el sol (`#EBBA4F`) para más de una acción por pantalla
- Reintroducir el verde lima / negro frío de la marca anterior