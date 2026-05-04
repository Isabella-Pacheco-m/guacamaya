-- 0001_init.sql — Guacamaya MVP

-- ============================================================
-- 1. Limpieza del MVP anterior (Flutter)
-- ============================================================
drop table if exists points_log         cascade;
drop table if exists referrals          cascade;
drop table if exists otp_codes          cascade;
drop table if exists parche_posts       cascade;
drop table if exists parche_members     cascade;
drop table if exists raffle_winners     cascade;
drop table if exists raffle_entries     cascade;
drop table if exists raffles            cascade;
drop table if exists redeemed_rewards   cascade;
drop table if exists rewards            cascade;
drop table if exists loyalty_cards      cascade;
drop table if exists loyalty_templates  cascade;
drop table if exists products           cascade;
drop table if exists business_locations cascade;
drop table if exists businesses         cascade;
drop table if exists users              cascade;

drop function if exists public.apply_stamp                cascade;
drop function if exists public.current_auth0_sub          cascade;
drop function if exists public.current_is_admin           cascade;
drop function if exists public.current_user_id            cascade;
drop function if exists public.find_business_by_qr_prefix cascade;
drop function if exists public.owns_business              cascade;
drop function if exists public.set_updated_at             cascade;

-- ============================================================
-- 2. Tablas Guacamaya
-- ============================================================
create table tenants (
  id             uuid primary key default gen_random_uuid(),
  nombre         text not null,
  slug           text not null unique,
  logo_url       text,
  color_primario text not null default '#305CFF',
  puntos_por_mil int  not null default 1,
  created_at     timestamptz not null default now()
);

create table miembros (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenants(id) on delete cascade,
  auth0_user_id     text unique,
  nombre            text not null,
  telefono          text,
  email             text,
  fecha_nacimiento  date,
  puntos_actuales   int  not null default 0,
  puntos_historicos int  not null default 0,
  nivel             text not null default 'BRONCE',
  created_at        timestamptz not null default now(),
  unique (tenant_id, telefono)
);

create table transacciones (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  miembro_id   uuid not null references miembros(id) on delete cascade,
  tipo         text not null,
  monto_cop    int,
  puntos_delta int  not null,
  nota         text,
  created_at   timestamptz not null default now()
);

create table recompensas (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  nombre       text not null,
  descripcion  text,
  costo_puntos int  not null,
  activa       boolean not null default true,
  imagen_url   text,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- 3. Índices
-- ============================================================
create index idx_miembros_tenant       on miembros(tenant_id);
create index idx_transacciones_tenant  on transacciones(tenant_id);
create index idx_transacciones_miembro on transacciones(miembro_id);
create index idx_recompensas_tenant    on recompensas(tenant_id);

-- ============================================================
-- 4. Row Level Security — aislamiento por tenant
-- ============================================================
alter table miembros      enable row level security;
alter table transacciones enable row level security;
alter table recompensas   enable row level security;

create policy "tenant_isolation" on miembros
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

create policy "tenant_isolation" on transacciones
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

create policy "tenant_isolation" on recompensas
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

-- ============================================================
-- 5. RPC: set_config restringido a app.tenant_id
-- ============================================================
create or replace function public.set_config(setting text, value text, is_local boolean)
returns text
language plpgsql
security definer
as $$
begin
  if setting <> 'app.tenant_id' then
    raise exception 'set_config(): solo se permite app.tenant_id';
  end if;
  return pg_catalog.set_config(setting, value, is_local);
end;
$$;
