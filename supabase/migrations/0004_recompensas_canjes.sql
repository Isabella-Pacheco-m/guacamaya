-- 0004_recompensas_canjes.sql — Guacamaya
-- RPCs para CRUD de recompensas (admin) + listado público (PWA) + register_canje atómico.

-- ============================================================
-- list_recompensas — admin, todas (activas + inactivas)
-- ============================================================
create or replace function public.list_recompensas(p_tenant_id uuid)
returns setof recompensas
language plpgsql
security invoker
as $$
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  return query
    select *
    from recompensas
    where tenant_id = p_tenant_id
    order by activa desc, created_at desc;
end;
$$;

-- ============================================================
-- list_recompensas_activas — público (PWA), solo activas
-- ============================================================
create or replace function public.list_recompensas_activas(p_tenant_id uuid)
returns setof recompensas
language plpgsql
security invoker
as $$
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  return query
    select *
    from recompensas
    where tenant_id = p_tenant_id
      and activa = true
    order by costo_puntos asc;
end;
$$;

-- ============================================================
-- create_recompensa
-- ============================================================
create or replace function public.create_recompensa(
  p_tenant_id    uuid,
  p_nombre       text,
  p_costo_puntos int,
  p_descripcion  text default null,
  p_imagen_url   text default null
)
returns recompensas
language plpgsql
security invoker
as $$
declare
  v_row recompensas;
begin
  if p_costo_puntos is null or p_costo_puntos <= 0 then
    raise exception 'costo_puntos debe ser positivo';
  end if;

  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);

  insert into recompensas (tenant_id, nombre, descripcion, costo_puntos, imagen_url)
  values (p_tenant_id, p_nombre, p_descripcion, p_costo_puntos, p_imagen_url)
  returning * into v_row;

  return v_row;
end;
$$;

-- ============================================================
-- update_recompensa — PATCH semantics: NULL = no cambia
-- ============================================================
create or replace function public.update_recompensa(
  p_tenant_id    uuid,
  p_id           uuid,
  p_nombre       text default null,
  p_descripcion  text default null,
  p_costo_puntos int  default null,
  p_activa       boolean default null,
  p_imagen_url   text default null
)
returns recompensas
language plpgsql
security invoker
as $$
declare
  v_row recompensas;
begin
  if p_costo_puntos is not null and p_costo_puntos <= 0 then
    raise exception 'costo_puntos debe ser positivo';
  end if;

  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);

  update recompensas set
    nombre       = coalesce(p_nombre,       nombre),
    descripcion  = coalesce(p_descripcion,  descripcion),
    costo_puntos = coalesce(p_costo_puntos, costo_puntos),
    activa       = coalesce(p_activa,       activa),
    imagen_url   = coalesce(p_imagen_url,   imagen_url)
  where id = p_id
    and tenant_id = p_tenant_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'recompensa no encontrada';
  end if;

  return v_row;
end;
$$;

-- ============================================================
-- register_canje — atómico
--   Lock order: recompensa → miembro (consistente para evitar deadlocks)
--   Valida: recompensa existe + activa, miembro existe, puntos suficientes
--   Aplica: descuenta puntos_actuales (NO toca puntos_historicos ni nivel)
--   Inserta: transaccion tipo CANJE con puntos_delta negativo
--   Retorna: { miembro, transaccion, recompensa }
-- ============================================================
create or replace function public.register_canje(
  p_tenant_id     uuid,
  p_miembro_id    uuid,
  p_recompensa_id uuid
)
returns json
language plpgsql
security invoker
as $$
declare
  v_recompensa  recompensas;
  v_miembro     miembros;
  v_transaccion transacciones;
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);

  select *
  into v_recompensa
  from recompensas
  where id = p_recompensa_id
    and tenant_id = p_tenant_id
  for update;
  if v_recompensa.id is null then
    raise exception 'recompensa no encontrada';
  end if;
  if not v_recompensa.activa then
    raise exception 'recompensa no activa';
  end if;

  select *
  into v_miembro
  from miembros
  where id = p_miembro_id
    and tenant_id = p_tenant_id
  for update;
  if v_miembro.id is null then
    raise exception 'miembro no encontrado';
  end if;

  if v_miembro.puntos_actuales < v_recompensa.costo_puntos then
    raise exception 'puntos insuficientes';
  end if;

  update miembros
  set puntos_actuales = puntos_actuales - v_recompensa.costo_puntos
  where id = p_miembro_id
  returning * into v_miembro;

  insert into transacciones (tenant_id, miembro_id, tipo, puntos_delta, nota)
  values (
    p_tenant_id,
    p_miembro_id,
    'CANJE',
    -v_recompensa.costo_puntos,
    'Canje: ' || v_recompensa.nombre
  )
  returning * into v_transaccion;

  return json_build_object(
    'miembro',     row_to_json(v_miembro),
    'transaccion', row_to_json(v_transaccion),
    'recompensa',  row_to_json(v_recompensa)
  );
end;
$$;
