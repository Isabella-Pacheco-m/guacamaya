-- 0011_tenant_features.sql — Feature toggles por tenant.
--
-- Foundation para que cada negocio active/desactive funcionalidades opcionales
-- de su panel: feed de comunidad, sorteos, tarjeta de fidelización (sellos),
-- pregunta de mes de cumpleaños. 1:1 con tenants.
--
-- Sin RLS — solo accesible vía service role tras requireAdmin/requireCliente.
-- La PWA del cliente lee estos flags desde el server (Server Components) para
-- renderizar tabs/secciones condicionales, no expone la tabla al browser.

create table if not exists tenant_features (
  tenant_id          uuid primary key references tenants(id) on delete cascade,
  feed_enabled       boolean not null default false,
  sorteos_enabled    boolean not null default false,
  tarjeta_enabled    boolean not null default false,
  cumpleanos_enabled boolean not null default false,
  updated_at         timestamptz not null default now(),
  created_at         timestamptz not null default now()
);

alter table tenant_features disable row level security;

-- Backfill: todo tenant existente recibe una fila default con todas las
-- features apagadas. Idempotente — corre seguro varias veces.
insert into tenant_features (tenant_id)
  select id from tenants
  on conflict (tenant_id) do nothing;
