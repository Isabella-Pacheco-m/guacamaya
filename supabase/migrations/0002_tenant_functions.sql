-- 0002_tenant_functions.sql — Guacamaya
-- Funciones RPC por tenant. Cada una:
--   1. Hace set_config('app.tenant_id', ...) → activa la policy RLS para callers no-service_role
--   2. Filtra explícitamente por p_tenant_id → defensa contra service_role (que bypasea RLS)
-- Compatible con PgBouncer transaction mode: una llamada RPC = una transacción =
-- set_local persiste hasta que el query interno termina.

-- ============================================================
-- list_miembros(p_tenant_id)
-- ============================================================
create or replace function public.list_miembros(p_tenant_id uuid)
returns setof miembros
language plpgsql
security invoker
as $$
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  return query
    select *
    from miembros
    where tenant_id = p_tenant_id
    order by created_at desc;
end;
$$;

-- ============================================================
-- create_miembro(p_tenant_id, p_nombre, p_telefono, p_email)
-- ============================================================
create or replace function public.create_miembro(
  p_tenant_id uuid,
  p_nombre    text,
  p_telefono  text default null,
  p_email     text default null
)
returns miembros
language plpgsql
security invoker
as $$
declare
  v_row miembros;
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  insert into miembros (tenant_id, nombre, telefono, email)
  values (p_tenant_id, p_nombre, p_telefono, p_email)
  returning * into v_row;
  return v_row;
end;
$$;

-- ============================================================
-- get_miembro_by_id(p_tenant_id, p_miembro_id)
-- ============================================================
create or replace function public.get_miembro_by_id(
  p_tenant_id  uuid,
  p_miembro_id uuid
)
returns miembros
language plpgsql
security invoker
as $$
declare
  v_row miembros;
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  select *
  into v_row
  from miembros
  where id = p_miembro_id
    and tenant_id = p_tenant_id;
  return v_row;
end;
$$;
