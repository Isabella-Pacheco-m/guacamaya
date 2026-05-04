-- 0010_admin_invitations.sql — Magic-link onboarding para el primer admin
-- de un tenant nuevo (creado por el superadmin).
--
-- Diseño paralelo a 0005_invitaciones.sql pero apuntando a tenant_id (no
-- miembro_id). El "consumo" del token NO escribe en Postgres — escribe
-- app_metadata.tenantId del usuario en Auth0 vía Management API. Postgres
-- solo trackea estado del token (no usado / usado / expirado) y el
-- auth0_user_id que lo consumió, como auditoría.
--
-- Acceso solo desde el server (service role). No tiene RLS por tenant
-- porque el caller (superadmin) no tiene tenant_id de sesión.

create table if not exists admin_invitations (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references tenants(id) on delete cascade,
  email                 text,                       -- hint para mostrar en UI; no usado para auth
  token_hash            text not null,
  expires_at            timestamptz not null,
  used_at               timestamptz,
  used_by_auth0_user_id text,
  created_by_email      text,                       -- email del superadmin que creó la invitación
  created_at            timestamptz not null default now()
);

create unique index if not exists admin_invitations_token_hash_key
  on admin_invitations(token_hash);
create index if not exists admin_invitations_tenant_idx
  on admin_invitations(tenant_id);

-- Sin RLS: solo accesible vía service role.
alter table admin_invitations disable row level security;

-- ============================================================
-- Funciones
-- ============================================================

-- Crear invitación de admin. El servidor calcula sha256 del token plano
-- y solo manda el hash. El token plaintext nunca toca la DB.
create or replace function public.generate_admin_invitation(
  p_tenant_id        uuid,
  p_email            text,
  p_token_hash       text,
  p_ttl_days         int default 7,
  p_created_by_email text default null
) returns admin_invitations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row admin_invitations;
begin
  if not exists (select 1 from tenants where id = p_tenant_id) then
    raise exception 'tenant no encontrado';
  end if;

  insert into admin_invitations (
    tenant_id, email, token_hash, expires_at, created_by_email
  )
  values (
    p_tenant_id,
    nullif(trim(p_email), ''),
    p_token_hash,
    now() + (greatest(1, least(coalesce(p_ttl_days, 7), 30)) || ' days')::interval,
    nullif(trim(p_created_by_email), '')
  )
  returning * into v_row;

  return v_row;
end;
$$;

-- Lookup por token (sin canjear). Útil para que la página /admin-claim
-- pueda mostrar a qué tenant pertenece antes de pedir login.
create or replace function public.get_admin_invitation_by_token(
  p_token_hash text
) returns admin_invitations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row admin_invitations;
begin
  select * into v_row
  from admin_invitations
  where token_hash = p_token_hash;
  return v_row; -- null si no existe
end;
$$;

-- Marcar invitación como usada. Atómico: locks la fila, valida (existe,
-- no usada, no expirada), y marca con auth0_user_id. La escritura en
-- Auth0 (app_metadata.tenantId) la hace el caller ANTES de llamar este
-- RPC — si Auth0 falla, no marcamos la invitación como usada.
create or replace function public.consume_admin_invitation(
  p_token_hash    text,
  p_auth0_user_id text
) returns admin_invitations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row admin_invitations;
begin
  select * into v_row
  from admin_invitations
  where token_hash = p_token_hash
  for update;

  if not found then
    raise exception 'invitacion no encontrada';
  end if;

  if v_row.used_at is not null then
    raise exception 'invitacion ya canjeada';
  end if;

  if v_row.expires_at < now() then
    raise exception 'invitacion expirada';
  end if;

  update admin_invitations
  set used_at = now(),
      used_by_auth0_user_id = p_auth0_user_id
  where id = v_row.id
  returning * into v_row;

  return v_row;
end;
$$;

-- Listar invitaciones de un tenant (panel del superadmin).
create or replace function public.list_admin_invitations_for_tenant(
  p_tenant_id uuid
) returns setof admin_invitations
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select *
    from admin_invitations
    where tenant_id = p_tenant_id
    order by created_at desc;
end;
$$;
