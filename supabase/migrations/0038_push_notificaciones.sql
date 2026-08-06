-- 0038_push_notificaciones.sql — Notificaciones push del negocio a su club.
--
-- Web Push estándar (VAPID): el negocio redacta un mensaje en el panel y le
-- llega como notificación nativa a los miembros que instalaron la PWA y
-- aceptaron el permiso. Sin intermediarios ni costo por mensaje.
--
--   - `push_suscripciones`: una fila por dispositivo suscrito. El endpoint es
--     único global (lo emite el push service del navegador por origen, y cada
--     tenant vive en su propio subdominio). Cascade con tenant y miembro.
--   - `push_envios`: historial de campañas enviadas, con contadores.
--
-- Acceso directo con service role desde lib/push.ts (mismo patrón que
-- invitaciones) — sin RPCs. RLS de defensa igual que el resto de tablas;
-- los defaults de 0020 dejan las tablas nuevas solo para service_role.

-- Flag de la funcionalidad.
alter table tenant_features
  add column if not exists push_enabled boolean not null default false;

create table if not exists push_suscripciones (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  miembro_id uuid not null references miembros(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_push_susc_tenant  on push_suscripciones (tenant_id);
create index if not exists idx_push_susc_miembro on push_suscripciones (miembro_id);

alter table push_suscripciones enable row level security;

drop policy if exists "tenant_isolation" on push_suscripciones;
create policy "tenant_isolation" on push_suscripciones
  using (tenant_id = (current_setting('app.tenant_id'))::uuid);

create table if not exists push_envios (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  titulo     text not null,
  cuerpo     text not null,
  url        text,
  enviados   int not null default 0,
  fallidos   int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_push_envios_tenant
  on push_envios (tenant_id, created_at desc);

alter table push_envios enable row level security;

drop policy if exists "tenant_isolation" on push_envios;
create policy "tenant_isolation" on push_envios
  using (tenant_id = (current_setting('app.tenant_id'))::uuid);
