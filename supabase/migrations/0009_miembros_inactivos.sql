-- 0009_miembros_inactivos.sql — listado de clientes que no compran hace N días.
--
-- "Inactivo" = miembro creado hace >= p_dias y sin transacciones tipo COMPRA
-- en los últimos p_dias. Incluye miembros que nunca han comprado pero ya
-- llevan tiempo registrados (last_compra IS NULL).
--
-- Ordena por última compra ascendente (nulls first), de modo que los
-- miembros más fríos aparezcan primero. Limit por defecto 200 — suficiente
-- para el listado del admin sin paginación inicial.
--
-- security invoker + set_config(app.tenant_id) — patrón estándar.

create or replace function public.get_miembros_inactivos(
  p_tenant_id uuid,
  p_dias      int default 30,
  p_limit     int default 200
)
returns table (
  id              uuid,
  nombre          text,
  telefono        text,
  email           text,
  puntos_actuales int,
  nivel           text,
  ultima_compra   timestamptz,
  dias_inactivo   int
)
language plpgsql
security invoker
as $$
declare
  v_dias  int;
  v_corte timestamptz;
begin
  v_dias  := greatest(1, least(coalesce(p_dias, 30), 365));
  v_corte := now() - (v_dias || ' days')::interval;

  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);

  return query
  select
    m.id,
    m.nombre,
    m.telefono,
    m.email,
    m.puntos_actuales,
    m.nivel,
    uc.ultima_compra,
    case
      when uc.ultima_compra is null
        then extract(day from (now() - m.created_at))::int
      else extract(day from (now() - uc.ultima_compra))::int
    end as dias_inactivo
  from miembros m
  left join lateral (
    select max(t.created_at) as ultima_compra
    from transacciones t
    where t.tenant_id = m.tenant_id
      and t.miembro_id = m.id
      and t.tipo = 'COMPRA'
  ) uc on true
  where m.tenant_id = p_tenant_id
    and m.created_at <= v_corte
    and (uc.ultima_compra is null or uc.ultima_compra < v_corte)
  order by uc.ultima_compra asc nulls first, m.created_at asc
  limit greatest(1, least(coalesce(p_limit, 200), 1000));
end;
$$;
