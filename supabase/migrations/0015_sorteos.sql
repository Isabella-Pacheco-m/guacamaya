-- 0015_sorteos.sql — sorteos por tenant.
--
-- Admin crea un sorteo (titulo, descripcion, requisitos, imagen, fecha de
-- cierre opcional). Cada miembro puede participar una sola vez subiendo una
-- evidencia opcional (foto de factura, captura de follow, etc.). Al final, el
-- admin elige el ganador (manual o aleatorio).
--
-- Estados:
--   ABIERTO   — admite participaciones
--   CERRADO   — ya no admite participaciones, todavía sin ganador
--   SORTEADO  — ya tiene ganador

create table if not exists sorteos (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  titulo        text not null,
  descripcion   text,
  requisitos    text,
  imagen_url    text,
  cierra_at     timestamptz,
  estado        text not null default 'ABIERTO'
                check (estado in ('ABIERTO', 'CERRADO', 'SORTEADO')),
  ganador_miembro_id uuid references miembros(id),
  created_at    timestamptz not null default now()
);

alter table sorteos enable row level security;
drop policy if exists tenant_isolation on sorteos;
create policy tenant_isolation on sorteos
  using (tenant_id = (current_setting('app.tenant_id'))::uuid);

create index if not exists idx_sorteos_tenant_created
  on sorteos(tenant_id, created_at desc);

create table if not exists sorteo_participaciones (
  id           uuid primary key default gen_random_uuid(),
  sorteo_id    uuid not null references sorteos(id) on delete cascade,
  tenant_id    uuid not null references tenants(id) on delete cascade,
  miembro_id   uuid not null references miembros(id) on delete cascade,
  evidencia_url text,
  comentario   text,
  created_at   timestamptz not null default now(),
  unique(sorteo_id, miembro_id)
);

alter table sorteo_participaciones enable row level security;
drop policy if exists tenant_isolation on sorteo_participaciones;
create policy tenant_isolation on sorteo_participaciones
  using (tenant_id = (current_setting('app.tenant_id'))::uuid);

create index if not exists idx_sorteo_part_sorteo
  on sorteo_participaciones(sorteo_id);

-- ============================================================
-- list_sorteos_admin: todos los sorteos del tenant + conteo.
-- ============================================================
create or replace function public.list_sorteos_admin(
  p_tenant_id uuid
) returns table (
  id uuid,
  tenant_id uuid,
  titulo text,
  descripcion text,
  requisitos text,
  imagen_url text,
  cierra_at timestamptz,
  estado text,
  ganador_miembro_id uuid,
  created_at timestamptz,
  participaciones_count bigint
)
language plpgsql
security invoker
as $$
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  return query
    select s.id, s.tenant_id, s.titulo, s.descripcion, s.requisitos,
           s.imagen_url, s.cierra_at, s.estado, s.ganador_miembro_id,
           s.created_at,
           coalesce(c.cnt, 0) as participaciones_count
    from sorteos s
    left join (
      select sp.sorteo_id, count(*) as cnt
      from sorteo_participaciones sp
      where sp.tenant_id = p_tenant_id
      group by sp.sorteo_id
    ) c on c.sorteo_id = s.id
    where s.tenant_id = p_tenant_id
    order by s.created_at desc;
end;
$$;

-- ============================================================
-- list_sorteos_activos: para PWA cliente. Solo ABIERTO o CERRADO.
-- (No mostramos los SORTEADO en el listado público, salvo que tenga ganador
--  con miembro_id que coincida con el miembro consultante — eso lo decide el
--  caller, no el RPC.)
-- ============================================================
create or replace function public.list_sorteos_activos(
  p_tenant_id uuid
) returns setof sorteos
language plpgsql
security invoker
as $$
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  return query
    select * from sorteos
    where tenant_id = p_tenant_id
      and estado in ('ABIERTO', 'CERRADO')
    order by created_at desc;
end;
$$;

-- ============================================================
-- get_sorteo: una fila puntual con conteo y datos del ganador (si hay).
-- ============================================================
create or replace function public.get_sorteo(
  p_tenant_id uuid,
  p_id        uuid
) returns table (
  id uuid,
  tenant_id uuid,
  titulo text,
  descripcion text,
  requisitos text,
  imagen_url text,
  cierra_at timestamptz,
  estado text,
  ganador_miembro_id uuid,
  ganador_nombre text,
  created_at timestamptz,
  participaciones_count bigint
)
language plpgsql
security invoker
as $$
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  return query
    select s.id, s.tenant_id, s.titulo, s.descripcion, s.requisitos,
           s.imagen_url, s.cierra_at, s.estado, s.ganador_miembro_id,
           gm.nombre as ganador_nombre,
           s.created_at,
           (select count(*) from sorteo_participaciones p
              where p.sorteo_id = s.id and p.tenant_id = p_tenant_id) as participaciones_count
    from sorteos s
    left join miembros gm on gm.id = s.ganador_miembro_id
    where s.tenant_id = p_tenant_id and s.id = p_id;
end;
$$;

-- ============================================================
-- list_participaciones: para admin, con datos del miembro.
-- ============================================================
create or replace function public.list_participaciones(
  p_tenant_id uuid,
  p_sorteo_id uuid
) returns table (
  id uuid,
  miembro_id uuid,
  miembro_nombre text,
  miembro_telefono text,
  evidencia_url text,
  comentario text,
  created_at timestamptz
)
language plpgsql
security invoker
as $$
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  return query
    select p.id, p.miembro_id, m.nombre, m.telefono,
           p.evidencia_url, p.comentario, p.created_at
    from sorteo_participaciones p
    join miembros m on m.id = p.miembro_id
    where p.tenant_id = p_tenant_id and p.sorteo_id = p_sorteo_id
    order by p.created_at asc;
end;
$$;

-- ============================================================
-- create_sorteo: nuevo sorteo en estado ABIERTO.
-- ============================================================
create or replace function public.create_sorteo(
  p_tenant_id   uuid,
  p_titulo      text,
  p_descripcion text,
  p_requisitos  text,
  p_imagen_url  text,
  p_cierra_at   timestamptz
) returns sorteos
language plpgsql
security invoker
as $$
declare
  v_row sorteos;
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  if p_titulo is null or length(trim(p_titulo)) = 0 then
    raise exception 'titulo no puede estar vacio';
  end if;
  insert into sorteos (
    tenant_id, titulo, descripcion, requisitos, imagen_url, cierra_at, estado
  ) values (
    p_tenant_id,
    trim(p_titulo),
    nullif(trim(coalesce(p_descripcion, '')), ''),
    nullif(trim(coalesce(p_requisitos, '')), ''),
    nullif(trim(coalesce(p_imagen_url, '')), ''),
    p_cierra_at,
    'ABIERTO'
  ) returning * into v_row;
  return v_row;
end;
$$;

-- ============================================================
-- close_sorteo: cierra participaciones, sin asignar ganador.
-- ============================================================
create or replace function public.close_sorteo(
  p_tenant_id uuid,
  p_id        uuid
) returns sorteos
language plpgsql
security invoker
as $$
declare
  v_row sorteos;
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  update sorteos
  set estado = 'CERRADO'
  where id = p_id and tenant_id = p_tenant_id and estado = 'ABIERTO'
  returning * into v_row;
  if not found then
    raise exception 'sorteo no encontrado o ya no esta abierto';
  end if;
  return v_row;
end;
$$;

-- ============================================================
-- pick_winner: elige ganador. Si p_miembro_id es null, escoge aleatorio
-- entre las participaciones. Cambia estado a SORTEADO. Solo si está en
-- ABIERTO o CERRADO.
-- ============================================================
create or replace function public.pick_sorteo_winner(
  p_tenant_id  uuid,
  p_id         uuid,
  p_miembro_id uuid default null
) returns sorteos
language plpgsql
security invoker
as $$
declare
  v_row sorteos;
  v_winner uuid;
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);

  select * into v_row from sorteos
   where id = p_id and tenant_id = p_tenant_id;
  if not found then raise exception 'sorteo no encontrado'; end if;
  if v_row.estado = 'SORTEADO' then
    raise exception 'sorteo ya tiene ganador';
  end if;

  if p_miembro_id is not null then
    perform 1 from sorteo_participaciones
      where sorteo_id = p_id and miembro_id = p_miembro_id
        and tenant_id = p_tenant_id;
    if not found then
      raise exception 'el miembro no participo en este sorteo';
    end if;
    v_winner := p_miembro_id;
  else
    select miembro_id into v_winner
      from sorteo_participaciones
      where sorteo_id = p_id and tenant_id = p_tenant_id
      order by random()
      limit 1;
    if v_winner is null then
      raise exception 'no hay participaciones en este sorteo';
    end if;
  end if;

  update sorteos
    set ganador_miembro_id = v_winner,
        estado = 'SORTEADO'
    where id = p_id and tenant_id = p_tenant_id
    returning * into v_row;

  return v_row;
end;
$$;

-- ============================================================
-- delete_sorteo: borra el sorteo y retorna imagen_url + array de evidencias
-- para que el caller limpie storage.
-- ============================================================
create or replace function public.delete_sorteo(
  p_tenant_id uuid,
  p_id        uuid
) returns table (imagen_url text, evidencias text[])
language plpgsql
security invoker
as $$
declare
  v_imagen_url text;
  v_evidencias text[];
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);

  select array_agg(p.evidencia_url)
    into v_evidencias
    from sorteo_participaciones p
   where p.sorteo_id = p_id and p.tenant_id = p_tenant_id
     and p.evidencia_url is not null;

  delete from sorteos
   where id = p_id and tenant_id = p_tenant_id
   returning sorteos.imagen_url into v_imagen_url;
  if not found then raise exception 'sorteo no encontrado'; end if;

  return query select v_imagen_url, coalesce(v_evidencias, array[]::text[]);
end;
$$;

-- ============================================================
-- participar_sorteo: cliente PWA. Inserta una participacion si el sorteo
-- está ABIERTO y el miembro no participa todavía.
-- ============================================================
create or replace function public.participar_sorteo(
  p_tenant_id    uuid,
  p_sorteo_id    uuid,
  p_miembro_id   uuid,
  p_evidencia_url text,
  p_comentario   text
) returns sorteo_participaciones
language plpgsql
security invoker
as $$
declare
  v_estado text;
  v_row sorteo_participaciones;
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);

  select estado into v_estado from sorteos
    where id = p_sorteo_id and tenant_id = p_tenant_id;
  if not found then raise exception 'sorteo no encontrado'; end if;
  if v_estado <> 'ABIERTO' then
    raise exception 'sorteo no esta abierto';
  end if;

  insert into sorteo_participaciones (
    sorteo_id, tenant_id, miembro_id, evidencia_url, comentario
  ) values (
    p_sorteo_id, p_tenant_id, p_miembro_id,
    nullif(trim(coalesce(p_evidencia_url, '')), ''),
    nullif(trim(coalesce(p_comentario, '')), '')
  ) returning * into v_row;
  return v_row;
exception when unique_violation then
  raise exception 'ya participaste en este sorteo';
end;
$$;

-- ============================================================
-- get_mi_participacion: cliente consulta si ya participó.
-- ============================================================
create or replace function public.get_mi_participacion(
  p_tenant_id  uuid,
  p_sorteo_id  uuid,
  p_miembro_id uuid
) returns setof sorteo_participaciones
language plpgsql
security invoker
as $$
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  return query
    select * from sorteo_participaciones
    where sorteo_id = p_sorteo_id
      and miembro_id = p_miembro_id
      and tenant_id = p_tenant_id;
end;
$$;
