-- 0028_galeria.sql — Galería: los miembros suben fotos y ganan puntos al aprobarse.
--
-- Flujo: el miembro sube una foto (estado 'pendiente'). El admin la revisa y la
-- aprueba (acredita puntos + transaccion 'GALERIA' + sube nivel) o la rechaza.
-- Solo las aprobadas se muestran en la galería pública de la PWA.
--
--   tenant_features.galeria_enabled — activa la funcionalidad.
--   tenant_features.galeria_puntos  — puntos por defecto al aprobar (el admin
--                                     puede sobreescribir por foto).

alter table tenant_features
  add column if not exists galeria_enabled boolean not null default false;

alter table tenant_features
  add column if not exists galeria_puntos int not null default 0;

alter table tenant_features
  drop constraint if exists galeria_puntos_valido;
alter table tenant_features
  add constraint galeria_puntos_valido
  check (galeria_puntos >= 0 and galeria_puntos <= 100000) not valid;
alter table tenant_features validate constraint galeria_puntos_valido;

create table if not exists galeria_posts (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenants(id) on delete cascade,
  miembro_id       uuid not null references miembros(id) on delete cascade,
  imagen_url       text not null,
  caption          text,
  estado           text not null default 'pendiente',
  puntos_otorgados int not null default 0,
  created_at       timestamptz not null default now(),
  revisado_at      timestamptz
);

alter table galeria_posts
  drop constraint if exists galeria_estado_valido;
alter table galeria_posts
  add constraint galeria_estado_valido
  check (estado in ('pendiente', 'aprobado', 'rechazado')) not valid;
alter table galeria_posts validate constraint galeria_estado_valido;

create index if not exists idx_galeria_tenant_estado
  on galeria_posts (tenant_id, estado, created_at desc);
create index if not exists idx_galeria_miembro
  on galeria_posts (tenant_id, miembro_id, created_at desc);

alter table galeria_posts enable row level security;

drop policy if exists "tenant_isolation" on galeria_posts;
create policy "tenant_isolation" on galeria_posts
  using (tenant_id = (current_setting('app.tenant_id'))::uuid);

-- ============================================================
-- create_galeria_post — alta hecha por un miembro (queda 'pendiente').
-- Tope suave de 20 pendientes por miembro para evitar flooding.
-- ============================================================
create or replace function public.create_galeria_post(
  p_tenant_id  uuid,
  p_miembro_id uuid,
  p_imagen_url text,
  p_caption    text
) returns galeria_posts
language plpgsql
security invoker
as $$
declare
  v_row galeria_posts;
  v_pendientes int;
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  if p_imagen_url is null or length(trim(p_imagen_url)) = 0 then
    raise exception 'imagen requerida';
  end if;
  if not exists (
    select 1 from miembros where id = p_miembro_id and tenant_id = p_tenant_id
  ) then
    raise exception 'miembro no encontrado';
  end if;
  select count(*) into v_pendientes
  from galeria_posts
  where tenant_id = p_tenant_id and miembro_id = p_miembro_id and estado = 'pendiente';
  if v_pendientes >= 20 then
    raise exception 'demasiadas fotos pendientes';
  end if;
  insert into galeria_posts (tenant_id, miembro_id, imagen_url, caption)
  values (
    p_tenant_id,
    p_miembro_id,
    trim(p_imagen_url),
    nullif(trim(coalesce(p_caption, '')), '')
  )
  returning * into v_row;
  return v_row;
end;
$$;

-- ============================================================
-- list_galeria_aprobadas — feed público (solo aprobadas) con autor.
-- ============================================================
create or replace function public.list_galeria_aprobadas(
  p_tenant_id uuid,
  p_limit     int default 60
) returns table (
  id                 uuid,
  miembro_id         uuid,
  imagen_url         text,
  caption            text,
  created_at         timestamptz,
  miembro_nombre     text,
  miembro_avatar_url text
)
language plpgsql
security invoker
as $$
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  if p_limit < 1 then p_limit := 1; end if;
  if p_limit > 200 then p_limit := 200; end if;
  return query
    select g.id, g.miembro_id, g.imagen_url, g.caption, g.created_at,
           m.nombre, m.avatar_url
    from galeria_posts g
    join miembros m on m.id = g.miembro_id
    where g.tenant_id = p_tenant_id and g.estado = 'aprobado'
    order by g.created_at desc
    limit p_limit;
end;
$$;

-- ============================================================
-- list_galeria_miembro — envíos del propio miembro (cualquier estado).
-- ============================================================
create or replace function public.list_galeria_miembro(
  p_tenant_id  uuid,
  p_miembro_id uuid,
  p_limit      int default 40
) returns setof galeria_posts
language plpgsql
security invoker
as $$
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  return query
    select *
    from galeria_posts
    where tenant_id = p_tenant_id and miembro_id = p_miembro_id
    order by created_at desc
    limit greatest(1, least(p_limit, 200));
end;
$$;

-- ============================================================
-- list_galeria_admin — cola de moderación filtrada por estado, con autor.
-- ============================================================
create or replace function public.list_galeria_admin(
  p_tenant_id uuid,
  p_estado    text,
  p_limit     int default 100
) returns table (
  id               uuid,
  miembro_id       uuid,
  imagen_url       text,
  caption          text,
  estado           text,
  puntos_otorgados int,
  created_at       timestamptz,
  revisado_at      timestamptz,
  miembro_nombre   text,
  miembro_telefono text
)
language plpgsql
security invoker
as $$
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  if p_limit < 1 then p_limit := 1; end if;
  if p_limit > 300 then p_limit := 300; end if;
  return query
    select g.id, g.miembro_id, g.imagen_url, g.caption, g.estado,
           g.puntos_otorgados, g.created_at, g.revisado_at, m.nombre, m.telefono
    from galeria_posts g
    join miembros m on m.id = g.miembro_id
    where g.tenant_id = p_tenant_id
      and (p_estado is null or g.estado = p_estado)
    order by g.created_at desc
    limit p_limit;
end;
$$;

-- ============================================================
-- aprobar_galeria_post — aprueba y acredita puntos (si p_puntos > 0).
-- Guard: solo desde 'pendiente' (evita doble acreditación). Devuelve el post
-- y el miembro actualizado.
-- ============================================================
create or replace function public.aprobar_galeria_post(
  p_tenant_id uuid,
  p_id        uuid,
  p_puntos    int
) returns json
language plpgsql
security invoker
as $$
declare
  v_post    galeria_posts;
  v_miembro miembros;
  v_puntos  int := greatest(0, coalesce(p_puntos, 0));
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);

  select * into v_post
  from galeria_posts
  where id = p_id and tenant_id = p_tenant_id
  for update;
  if not found then
    raise exception 'foto no encontrada';
  end if;
  if v_post.estado <> 'pendiente' then
    raise exception 'foto ya revisada';
  end if;

  update galeria_posts
  set estado = 'aprobado', puntos_otorgados = v_puntos, revisado_at = now()
  where id = p_id
  returning * into v_post;

  if v_puntos > 0 then
    update miembros
    set puntos_actuales = puntos_actuales + v_puntos,
        puntos_historicos = puntos_historicos + v_puntos,
        nivel = case
          when puntos_historicos + v_puntos >= 2000 then 'ORO'
          when puntos_historicos + v_puntos >= 500  then 'PLATA'
          else 'BRONCE'
        end
    where id = v_post.miembro_id and tenant_id = p_tenant_id
    returning * into v_miembro;

    insert into transacciones (tenant_id, miembro_id, tipo, puntos_delta, nota)
    values (p_tenant_id, v_post.miembro_id, 'GALERIA', v_puntos, 'Foto aprobada en galería');
  else
    select * into v_miembro from miembros where id = v_post.miembro_id;
  end if;

  return json_build_object(
    'post', row_to_json(v_post),
    'miembro', row_to_json(v_miembro)
  );
end;
$$;

-- ============================================================
-- rechazar_galeria_post — marca 'rechazado' (solo desde 'pendiente').
-- ============================================================
create or replace function public.rechazar_galeria_post(
  p_tenant_id uuid,
  p_id        uuid
) returns galeria_posts
language plpgsql
security invoker
as $$
declare
  v_post galeria_posts;
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  select * into v_post
  from galeria_posts
  where id = p_id and tenant_id = p_tenant_id
  for update;
  if not found then
    raise exception 'foto no encontrada';
  end if;
  if v_post.estado <> 'pendiente' then
    raise exception 'foto ya revisada';
  end if;
  update galeria_posts
  set estado = 'rechazado', revisado_at = now()
  where id = p_id
  returning * into v_post;
  return v_post;
end;
$$;

revoke execute on function public.create_galeria_post(uuid, uuid, text, text) from public, anon, authenticated;
revoke execute on function public.list_galeria_aprobadas(uuid, int) from public, anon, authenticated;
revoke execute on function public.list_galeria_miembro(uuid, uuid, int) from public, anon, authenticated;
revoke execute on function public.list_galeria_admin(uuid, text, int) from public, anon, authenticated;
revoke execute on function public.aprobar_galeria_post(uuid, uuid, int) from public, anon, authenticated;
revoke execute on function public.rechazar_galeria_post(uuid, uuid) from public, anon, authenticated;
grant execute on function public.create_galeria_post(uuid, uuid, text, text) to service_role, postgres;
grant execute on function public.list_galeria_aprobadas(uuid, int) to service_role, postgres;
grant execute on function public.list_galeria_miembro(uuid, uuid, int) to service_role, postgres;
grant execute on function public.list_galeria_admin(uuid, text, int) to service_role, postgres;
grant execute on function public.aprobar_galeria_post(uuid, uuid, int) to service_role, postgres;
grant execute on function public.rechazar_galeria_post(uuid, uuid) to service_role, postgres;
