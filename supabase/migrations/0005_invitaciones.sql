-- 0005_invitaciones.sql — Magic-link invitations for client PWA login.
--
-- Diseño:
--  · El admin genera un token aleatorio en el servidor (32 bytes base64url).
--  · Solo el HASH (sha256) llega a Postgres — el plaintext nunca toca la DB.
--  · El cliente abre {slug}.guacamaya.co/invite/{token}, hace login en Auth0,
--    y el servidor valida + canjea atómicamente.
--  · Canje: vincula miembro.auth0_user_id ↔ session.user.sub. A partir de ahí
--    el PWA resuelve miembro por (tenant_id, auth0_user_id) sin claim de Auth0.

-- ============================================================
-- 1. Cambio de unique en miembros: global → por tenant
-- ============================================================
-- El MVP asumía que un Auth0 user solo era miembro de UN tenant. Cuando un
-- cliente sea miembro de varios negocios necesitamos scope por tenant.
alter table miembros drop constraint if exists miembros_auth0_user_id_key;
alter table miembros
  add constraint miembros_auth0_per_tenant_key
  unique (tenant_id, auth0_user_id);

-- ============================================================
-- 2. Tabla invitaciones
-- ============================================================
create table if not exists invitaciones (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references tenants(id) on delete cascade,
  miembro_id            uuid not null references miembros(id) on delete cascade,
  token_hash            text not null,
  expires_at            timestamptz not null,
  used_at               timestamptz,
  used_by_auth0_user_id text,
  created_at            timestamptz not null default now()
);

create unique index if not exists invitaciones_token_hash_key on invitaciones(token_hash);
create index if not exists invitaciones_miembro_idx on invitaciones(miembro_id);
create index if not exists invitaciones_tenant_idx  on invitaciones(tenant_id);

alter table invitaciones enable row level security;
create policy "tenant_isolation" on invitaciones
  using (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

-- ============================================================
-- 3. Funciones
-- ============================================================

-- Crear invitación. Recibe el HASH (sha256 hex) calculado por el servidor.
create or replace function public.generate_invitacion(
  p_tenant_id  uuid,
  p_miembro_id uuid,
  p_token_hash text,
  p_ttl_days   int default 30
) returns invitaciones
language plpgsql
security invoker
as $$
declare
  v_row invitaciones;
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);

  if not exists (
    select 1 from miembros where id = p_miembro_id and tenant_id = p_tenant_id
  ) then
    raise exception 'miembro no encontrado';
  end if;

  insert into invitaciones (tenant_id, miembro_id, token_hash, expires_at)
  values (p_tenant_id, p_miembro_id, p_token_hash, now() + (p_ttl_days || ' days')::interval)
  returning * into v_row;

  return v_row;
end;
$$;

-- Canjear invitación. Atómico:
--   1. Lock invitación (FOR UPDATE)
--   2. Validar (existe, no usada, no expirada)
--   3. Lock miembro
--   4. Si el miembro ya tiene auth0_user_id distinto → error
--   5. Si el auth0 user ya tiene OTRO miembro en este tenant → error
--   6. Update miembros.auth0_user_id
--   7. Mark invitacion.used_at
create or replace function public.redeem_invitacion(
  p_tenant_id      uuid,
  p_token_hash     text,
  p_auth0_user_id  text
) returns json
language plpgsql
security invoker
as $$
declare
  v_invitacion invitaciones;
  v_miembro    miembros;
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);

  select * into v_invitacion
  from invitaciones
  where tenant_id = p_tenant_id and token_hash = p_token_hash
  for update;

  if not found then
    raise exception 'invitacion no encontrada';
  end if;

  if v_invitacion.used_at is not null then
    raise exception 'invitacion ya canjeada';
  end if;

  if v_invitacion.expires_at < now() then
    raise exception 'invitacion expirada';
  end if;

  select * into v_miembro
  from miembros
  where id = v_invitacion.miembro_id and tenant_id = p_tenant_id
  for update;

  if v_miembro.auth0_user_id is not null
     and v_miembro.auth0_user_id <> p_auth0_user_id then
    raise exception 'miembro ya vinculado a otro usuario';
  end if;

  if exists (
    select 1 from miembros
    where tenant_id = p_tenant_id
      and auth0_user_id = p_auth0_user_id
      and id <> v_miembro.id
  ) then
    raise exception 'auth0 user ya tiene un miembro en este tenant';
  end if;

  update miembros
  set auth0_user_id = p_auth0_user_id
  where id = v_miembro.id;

  update invitaciones
  set used_at = now(), used_by_auth0_user_id = p_auth0_user_id
  where id = v_invitacion.id;

  select * into v_miembro from miembros where id = v_miembro.id;

  return json_build_object('miembro', row_to_json(v_miembro));
end;
$$;

-- Resolver miembro por Auth0 user (PWA: lookup por sesión).
create or replace function public.get_miembro_by_auth0(
  p_tenant_id     uuid,
  p_auth0_user_id text
) returns miembros
language plpgsql
security invoker
as $$
declare
  v_row miembros;
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  select * into v_row
  from miembros
  where tenant_id = p_tenant_id and auth0_user_id = p_auth0_user_id;
  return v_row;  -- null si no existe
end;
$$;

-- Listar invitaciones de un miembro (admin UI).
create or replace function public.list_invitaciones_for_miembro(
  p_tenant_id  uuid,
  p_miembro_id uuid
) returns setof invitaciones
language plpgsql
security invoker
as $$
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  return query
    select *
    from invitaciones
    where tenant_id = p_tenant_id and miembro_id = p_miembro_id
    order by created_at desc;
end;
$$;
