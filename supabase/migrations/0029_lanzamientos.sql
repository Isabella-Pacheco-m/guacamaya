-- 0029_lanzamientos.sql — Lanzamientos de producto con campaña de expectativa.
--
-- La marca crea un lanzamiento con banner + copy. Puede arrancar en modo
-- 'teaser' (expectativa) con una fecha de revelado (revela_at): la PWA muestra
-- una cuenta regresiva y el copy de expectativa. Al llegar la fecha —o cuando
-- el admin lo pasa a 'activo'— se revela la descripción completa + CTA.
-- 'finalizado' lo archiva (deja de mostrarse en la PWA).
--
--   estados: 'teaser' | 'activo' | 'finalizado'

alter table tenant_features
  add column if not exists lanzamientos_enabled boolean not null default false;

create table if not exists lanzamientos (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  titulo      text not null,
  teaser      text,
  descripcion text,
  banner_url  text,
  cta_url     text,
  cta_label   text,
  estado      text not null default 'teaser',
  revela_at   timestamptz,
  created_at  timestamptz not null default now()
);

alter table lanzamientos
  drop constraint if exists lanzamiento_estado_valido;
alter table lanzamientos
  add constraint lanzamiento_estado_valido
  check (estado in ('teaser', 'activo', 'finalizado')) not valid;
alter table lanzamientos validate constraint lanzamiento_estado_valido;

create index if not exists idx_lanzamientos_tenant
  on lanzamientos (tenant_id, estado, created_at desc);

alter table lanzamientos enable row level security;

drop policy if exists "tenant_isolation" on lanzamientos;
create policy "tenant_isolation" on lanzamientos
  using (tenant_id = (current_setting('app.tenant_id'))::uuid);

-- ============================================================
-- create_lanzamiento(...) → lanzamiento creado.
-- Si p_estado no es válido, cae a 'teaser'.
-- ============================================================
create or replace function public.create_lanzamiento(
  p_tenant_id   uuid,
  p_titulo      text,
  p_teaser      text,
  p_descripcion text,
  p_banner_url  text,
  p_cta_url     text,
  p_cta_label   text,
  p_estado      text,
  p_revela_at   timestamptz
) returns lanzamientos
language plpgsql
security invoker
as $$
declare
  v_row lanzamientos;
  v_estado text := case when p_estado in ('teaser','activo') then p_estado else 'teaser' end;
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  if p_titulo is null or length(trim(p_titulo)) = 0 then
    raise exception 'titulo no puede estar vacio';
  end if;
  insert into lanzamientos (
    tenant_id, titulo, teaser, descripcion, banner_url, cta_url, cta_label,
    estado, revela_at
  ) values (
    p_tenant_id,
    trim(p_titulo),
    nullif(trim(coalesce(p_teaser, '')), ''),
    nullif(trim(coalesce(p_descripcion, '')), ''),
    nullif(trim(coalesce(p_banner_url, '')), ''),
    nullif(trim(coalesce(p_cta_url, '')), ''),
    nullif(trim(coalesce(p_cta_label, '')), ''),
    v_estado,
    p_revela_at
  )
  returning * into v_row;
  return v_row;
end;
$$;

-- ============================================================
-- list_lanzamientos_admin — todos, más recientes primero.
-- ============================================================
create or replace function public.list_lanzamientos_admin(
  p_tenant_id uuid
) returns setof lanzamientos
language plpgsql
security invoker
as $$
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  return query
    select * from lanzamientos
    where tenant_id = p_tenant_id
    order by created_at desc;
end;
$$;

-- ============================================================
-- list_lanzamientos_pwa — solo activos y teasers (no finalizados).
-- ============================================================
create or replace function public.list_lanzamientos_pwa(
  p_tenant_id uuid
) returns setof lanzamientos
language plpgsql
security invoker
as $$
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  return query
    select * from lanzamientos
    where tenant_id = p_tenant_id and estado <> 'finalizado'
    order by estado asc, created_at desc;
end;
$$;

-- ============================================================
-- set_lanzamiento_estado — cambia el estado (revelar / finalizar / teaser).
-- ============================================================
create or replace function public.set_lanzamiento_estado(
  p_tenant_id uuid,
  p_id        uuid,
  p_estado    text
) returns lanzamientos
language plpgsql
security invoker
as $$
declare
  v_row lanzamientos;
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  if p_estado not in ('teaser', 'activo', 'finalizado') then
    raise exception 'estado invalido';
  end if;
  update lanzamientos
  set estado = p_estado
  where id = p_id and tenant_id = p_tenant_id
  returning * into v_row;
  if not found then
    raise exception 'lanzamiento no encontrado';
  end if;
  return v_row;
end;
$$;

-- ============================================================
-- delete_lanzamiento → devuelve banner_url para limpiar el archivo.
-- ============================================================
create or replace function public.delete_lanzamiento(
  p_tenant_id uuid,
  p_id        uuid
) returns text
language plpgsql
security invoker
as $$
declare
  v_banner text;
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  delete from lanzamientos
  where id = p_id and tenant_id = p_tenant_id
  returning banner_url into v_banner;
  if not found then
    raise exception 'lanzamiento no encontrado';
  end if;
  return v_banner;
end;
$$;

revoke execute on function public.create_lanzamiento(uuid, text, text, text, text, text, text, text, timestamptz) from public, anon, authenticated;
revoke execute on function public.list_lanzamientos_admin(uuid) from public, anon, authenticated;
revoke execute on function public.list_lanzamientos_pwa(uuid) from public, anon, authenticated;
revoke execute on function public.set_lanzamiento_estado(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.delete_lanzamiento(uuid, uuid) from public, anon, authenticated;
grant execute on function public.create_lanzamiento(uuid, text, text, text, text, text, text, text, timestamptz) to service_role, postgres;
grant execute on function public.list_lanzamientos_admin(uuid) to service_role, postgres;
grant execute on function public.list_lanzamientos_pwa(uuid) to service_role, postgres;
grant execute on function public.set_lanzamiento_estado(uuid, uuid, text) to service_role, postgres;
grant execute on function public.delete_lanzamiento(uuid, uuid) to service_role, postgres;
