-- 0030_retos.sql — Retos (estilo Nike): metas que cualquier miembro puede
-- cumplir subiendo evidencia; el admin verifica cada envío y acredita puntos.
--
-- A diferencia de los sorteos (un ganador), en un reto TODOS los que cumplan
-- reciben la recompensa. El admin revisa cada participación:
--   'pendiente' → 'cumplido' (acredita retos.puntos, o el valor que ajuste)
--                 o 'rechazado'.
--
--   retos.estado: 'ABIERTO' (admite envíos) | 'CERRADO'.
--   reto_participaciones.estado: 'pendiente' | 'cumplido' | 'rechazado'.

alter table tenant_features
  add column if not exists retos_enabled boolean not null default false;

create table if not exists retos (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  titulo      text not null,
  descripcion text,
  requisitos  text,
  imagen_url  text,
  puntos      int not null default 0,
  cierra_at   timestamptz,
  estado      text not null default 'ABIERTO'
              check (estado in ('ABIERTO', 'CERRADO')),
  created_at  timestamptz not null default now()
);

alter table retos enable row level security;
drop policy if exists tenant_isolation on retos;
create policy tenant_isolation on retos
  using (tenant_id = (current_setting('app.tenant_id'))::uuid);

create index if not exists idx_retos_tenant_created
  on retos(tenant_id, created_at desc);

create table if not exists reto_participaciones (
  id               uuid primary key default gen_random_uuid(),
  reto_id          uuid not null references retos(id) on delete cascade,
  tenant_id        uuid not null references tenants(id) on delete cascade,
  miembro_id       uuid not null references miembros(id) on delete cascade,
  evidencia_url    text,
  comentario       text,
  estado           text not null default 'pendiente'
                   check (estado in ('pendiente', 'cumplido', 'rechazado')),
  puntos_otorgados int not null default 0,
  created_at       timestamptz not null default now(),
  revisado_at      timestamptz,
  unique(reto_id, miembro_id)
);

alter table reto_participaciones enable row level security;
drop policy if exists tenant_isolation on reto_participaciones;
create policy tenant_isolation on reto_participaciones
  using (tenant_id = (current_setting('app.tenant_id'))::uuid);

create index if not exists idx_reto_part_reto on reto_participaciones(reto_id);

-- ============================================================
-- list_retos_admin: retos + conteos (total y pendientes de revisar).
-- ============================================================
create or replace function public.list_retos_admin(
  p_tenant_id uuid
) returns table (
  id uuid, tenant_id uuid, titulo text, descripcion text, requisitos text,
  imagen_url text, puntos int, cierra_at timestamptz, estado text,
  created_at timestamptz, participaciones_count bigint, pendientes_count bigint
)
language plpgsql
security invoker
as $$
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  return query
    select r.id, r.tenant_id, r.titulo, r.descripcion, r.requisitos,
           r.imagen_url, r.puntos, r.cierra_at, r.estado, r.created_at,
           coalesce(c.total, 0), coalesce(c.pend, 0)
    from retos r
    left join (
      select p.reto_id,
             count(*) as total,
             count(*) filter (where p.estado = 'pendiente') as pend
      from reto_participaciones p
      where p.tenant_id = p_tenant_id
      group by p.reto_id
    ) c on c.reto_id = r.id
    where r.tenant_id = p_tenant_id
    order by r.created_at desc;
end;
$$;

-- ============================================================
-- list_retos_pwa: para el cliente. Solo ABIERTO o CERRADO (todos, de hecho).
-- ============================================================
create or replace function public.list_retos_pwa(
  p_tenant_id uuid
) returns setof retos
language plpgsql
security invoker
as $$
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  return query
    select * from retos
    where tenant_id = p_tenant_id
    order by (estado = 'ABIERTO') desc, created_at desc;
end;
$$;

-- ============================================================
-- get_reto: una fila con conteos.
-- ============================================================
create or replace function public.get_reto(
  p_tenant_id uuid, p_id uuid
) returns table (
  id uuid, tenant_id uuid, titulo text, descripcion text, requisitos text,
  imagen_url text, puntos int, cierra_at timestamptz, estado text,
  created_at timestamptz, participaciones_count bigint, cumplidos_count bigint
)
language plpgsql
security invoker
as $$
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  return query
    select r.id, r.tenant_id, r.titulo, r.descripcion, r.requisitos,
           r.imagen_url, r.puntos, r.cierra_at, r.estado, r.created_at,
           (select count(*) from reto_participaciones p
              where p.reto_id = r.id and p.tenant_id = p_tenant_id),
           (select count(*) from reto_participaciones p
              where p.reto_id = r.id and p.tenant_id = p_tenant_id and p.estado = 'cumplido')
    from retos r
    where r.tenant_id = p_tenant_id and r.id = p_id;
end;
$$;

-- ============================================================
-- list_reto_participaciones: para el admin (con datos del miembro).
-- ============================================================
create or replace function public.list_reto_participaciones(
  p_tenant_id uuid, p_reto_id uuid
) returns table (
  id uuid, miembro_id uuid, miembro_nombre text, miembro_telefono text,
  evidencia_url text, comentario text, estado text, puntos_otorgados int,
  created_at timestamptz, revisado_at timestamptz
)
language plpgsql
security invoker
as $$
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  return query
    select p.id, p.miembro_id, m.nombre, m.telefono, p.evidencia_url,
           p.comentario, p.estado, p.puntos_otorgados, p.created_at, p.revisado_at
    from reto_participaciones p
    join miembros m on m.id = p.miembro_id
    where p.tenant_id = p_tenant_id and p.reto_id = p_reto_id
    order by (p.estado = 'pendiente') desc, p.created_at asc;
end;
$$;

-- ============================================================
-- create_reto.
-- ============================================================
create or replace function public.create_reto(
  p_tenant_id uuid, p_titulo text, p_descripcion text, p_requisitos text,
  p_imagen_url text, p_puntos int, p_cierra_at timestamptz
) returns retos
language plpgsql
security invoker
as $$
declare
  v_row retos;
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  if p_titulo is null or length(trim(p_titulo)) = 0 then
    raise exception 'titulo no puede estar vacio';
  end if;
  insert into retos (tenant_id, titulo, descripcion, requisitos, imagen_url, puntos, cierra_at, estado)
  values (
    p_tenant_id, trim(p_titulo),
    nullif(trim(coalesce(p_descripcion, '')), ''),
    nullif(trim(coalesce(p_requisitos, '')), ''),
    nullif(trim(coalesce(p_imagen_url, '')), ''),
    greatest(0, coalesce(p_puntos, 0)),
    p_cierra_at, 'ABIERTO'
  ) returning * into v_row;
  return v_row;
end;
$$;

-- ============================================================
-- close_reto.
-- ============================================================
create or replace function public.close_reto(
  p_tenant_id uuid, p_id uuid
) returns retos
language plpgsql
security invoker
as $$
declare v_row retos;
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  update retos set estado = 'CERRADO'
  where id = p_id and tenant_id = p_tenant_id and estado = 'ABIERTO'
  returning * into v_row;
  if not found then raise exception 'reto no encontrado o ya cerrado'; end if;
  return v_row;
end;
$$;

-- ============================================================
-- delete_reto → imagen + evidencias para limpiar storage.
-- ============================================================
create or replace function public.delete_reto(
  p_tenant_id uuid, p_id uuid
) returns table (imagen_url text, evidencias text[])
language plpgsql
security invoker
as $$
declare v_imagen text; v_evid text[];
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  select array_agg(p.evidencia_url) into v_evid
  from reto_participaciones p
  where p.reto_id = p_id and p.tenant_id = p_tenant_id and p.evidencia_url is not null;
  delete from retos where id = p_id and tenant_id = p_tenant_id
  returning retos.imagen_url into v_imagen;
  if not found then raise exception 'reto no encontrado'; end if;
  return query select v_imagen, coalesce(v_evid, array[]::text[]);
end;
$$;

-- ============================================================
-- participar_reto: el miembro sube su evidencia (queda 'pendiente').
-- ============================================================
create or replace function public.participar_reto(
  p_tenant_id uuid, p_reto_id uuid, p_miembro_id uuid,
  p_evidencia_url text, p_comentario text
) returns reto_participaciones
language plpgsql
security invoker
as $$
declare v_estado text; v_row reto_participaciones;
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  select estado into v_estado from retos
    where id = p_reto_id and tenant_id = p_tenant_id;
  if not found then raise exception 'reto no encontrado'; end if;
  if v_estado <> 'ABIERTO' then raise exception 'reto no esta abierto'; end if;
  insert into reto_participaciones (reto_id, tenant_id, miembro_id, evidencia_url, comentario)
  values (
    p_reto_id, p_tenant_id, p_miembro_id,
    nullif(trim(coalesce(p_evidencia_url, '')), ''),
    nullif(trim(coalesce(p_comentario, '')), '')
  ) returning * into v_row;
  return v_row;
exception when unique_violation then
  raise exception 'ya participaste en este reto';
end;
$$;

-- ============================================================
-- get_mi_participacion_reto.
-- ============================================================
create or replace function public.get_mi_participacion_reto(
  p_tenant_id uuid, p_reto_id uuid, p_miembro_id uuid
) returns setof reto_participaciones
language plpgsql
security invoker
as $$
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  return query
    select * from reto_participaciones
    where reto_id = p_reto_id and miembro_id = p_miembro_id and tenant_id = p_tenant_id;
end;
$$;

-- ============================================================
-- revisar_reto_participacion: admin marca cumplido (acredita puntos +
-- transaccion 'RETO') o rechazado. Guard: solo desde 'pendiente'.
-- ============================================================
create or replace function public.revisar_reto_participacion(
  p_tenant_id uuid, p_participacion_id uuid, p_cumplido boolean, p_puntos int
) returns json
language plpgsql
security invoker
as $$
declare
  v_part reto_participaciones;
  v_miembro miembros;
  v_puntos int := greatest(0, coalesce(p_puntos, 0));
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);

  select * into v_part from reto_participaciones
    where id = p_participacion_id and tenant_id = p_tenant_id
    for update;
  if not found then raise exception 'participacion no encontrada'; end if;
  if v_part.estado <> 'pendiente' then raise exception 'participacion ya revisada'; end if;

  if p_cumplido then
    update reto_participaciones
    set estado = 'cumplido', puntos_otorgados = v_puntos, revisado_at = now()
    where id = p_participacion_id
    returning * into v_part;

    if v_puntos > 0 then
      update miembros
      set puntos_actuales = puntos_actuales + v_puntos,
          puntos_historicos = puntos_historicos + v_puntos,
          nivel = case
            when puntos_historicos + v_puntos >= 2000 then 'ORO'
            when puntos_historicos + v_puntos >= 500  then 'PLATA'
            else 'BRONCE'
          end
      where id = v_part.miembro_id and tenant_id = p_tenant_id
      returning * into v_miembro;

      insert into transacciones (tenant_id, miembro_id, tipo, puntos_delta, nota)
      values (p_tenant_id, v_part.miembro_id, 'RETO', v_puntos, 'Reto cumplido');
    else
      select * into v_miembro from miembros where id = v_part.miembro_id;
    end if;
  else
    update reto_participaciones
    set estado = 'rechazado', revisado_at = now()
    where id = p_participacion_id
    returning * into v_part;
    select * into v_miembro from miembros where id = v_part.miembro_id;
  end if;

  return json_build_object('participacion', row_to_json(v_part), 'miembro', row_to_json(v_miembro));
end;
$$;

revoke execute on function public.list_retos_admin(uuid) from public, anon, authenticated;
revoke execute on function public.list_retos_pwa(uuid) from public, anon, authenticated;
revoke execute on function public.get_reto(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.list_reto_participaciones(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.create_reto(uuid, text, text, text, text, int, timestamptz) from public, anon, authenticated;
revoke execute on function public.close_reto(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.delete_reto(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.participar_reto(uuid, uuid, uuid, text, text) from public, anon, authenticated;
revoke execute on function public.get_mi_participacion_reto(uuid, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.revisar_reto_participacion(uuid, uuid, boolean, int) from public, anon, authenticated;
grant execute on function public.list_retos_admin(uuid) to service_role, postgres;
grant execute on function public.list_retos_pwa(uuid) to service_role, postgres;
grant execute on function public.get_reto(uuid, uuid) to service_role, postgres;
grant execute on function public.list_reto_participaciones(uuid, uuid) to service_role, postgres;
grant execute on function public.create_reto(uuid, text, text, text, text, int, timestamptz) to service_role, postgres;
grant execute on function public.close_reto(uuid, uuid) to service_role, postgres;
grant execute on function public.delete_reto(uuid, uuid) to service_role, postgres;
grant execute on function public.participar_reto(uuid, uuid, uuid, text, text) to service_role, postgres;
grant execute on function public.get_mi_participacion_reto(uuid, uuid, uuid) to service_role, postgres;
grant execute on function public.revisar_reto_participacion(uuid, uuid, boolean, int) to service_role, postgres;
