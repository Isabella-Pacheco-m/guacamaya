-- 0033_ranking.sql — tabla de posiciones de la comunidad.
--
-- Ranking por `puntos_historicos` (acumulado de por vida), NO por
-- `puntos_actuales`: si se ordenara por saldo, canjear una recompensa te haría
-- caer puestos y el ranking castigaría justo la conducta que el club quiere
-- premiar. Por la misma razón los vencimientos (0032) tampoco lo mueven.
--
-- Es opt-in por negocio (`ranking_enabled`): expone nombre y foto de los
-- miembros al resto de la comunidad, así que la marca decide si lo enciende.

alter table tenant_features
  add column if not exists ranking_enabled boolean not null default false;

-- Sostiene el ORDER BY del ranking sin escanear todos los miembros del tenant.
create index if not exists idx_miembros_ranking
  on miembros (tenant_id, puntos_historicos desc);

-- Top N del tenant. `posicion` se calcula con row_number() sobre el conjunto
-- completo (la ventana corre antes del LIMIT), así que es la posición real.
-- Los empates se desempatan por antigüedad: quien llegó primero, primero.
create or replace function public.list_ranking(
  p_tenant_id uuid,
  p_limit     int default 10
) returns table (
  miembro_id uuid,
  nombre     text,
  avatar_url text,
  puntos     int,
  posicion   int
)
language plpgsql
security invoker
as $$
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  if p_limit < 1  then p_limit := 1;  end if;
  if p_limit > 50 then p_limit := 50; end if;

  return query
    select
      m.id,
      m.nombre,
      m.avatar_url,
      m.puntos_historicos,
      (row_number() over (
        order by m.puntos_historicos desc, m.created_at asc
      ))::int
    from miembros m
    where m.tenant_id = p_tenant_id
      and m.puntos_historicos > 0
    order by m.puntos_historicos desc, m.created_at asc
    limit p_limit;
end;
$$;

revoke execute on function public.list_ranking(uuid, int)
  from public, anon, authenticated;
grant execute on function public.list_ranking(uuid, int)
  to service_role, postgres;

-- Posición del miembro que está mirando. Se pide aparte del top para poder
-- mostrarle su lugar aunque esté fuera del top (fila fija al final de la
-- lista, estilo leaderboard de app deportiva).
-- Devuelve { posicion, puntos, total }; posicion = null si aún no tiene puntos.
create or replace function public.get_ranking_posicion(
  p_tenant_id  uuid,
  p_miembro_id uuid
) returns json
language plpgsql
security invoker
as $$
declare
  v_puntos   int;
  v_created  timestamptz;
  v_posicion int;
  v_total    int;
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);

  select puntos_historicos, created_at
  into v_puntos, v_created
  from miembros
  where id = p_miembro_id
    and tenant_id = p_tenant_id;

  select count(*)::int into v_total
  from miembros
  where tenant_id = p_tenant_id
    and puntos_historicos > 0;

  if v_puntos is null or v_puntos <= 0 then
    return json_build_object('posicion', null, 'puntos', coalesce(v_puntos, 0), 'total', v_total);
  end if;

  -- Mismo desempate que list_ranking: cuenta a los que van estrictamente por
  -- delante y suma 1.
  select count(*)::int + 1 into v_posicion
  from miembros m
  where m.tenant_id = p_tenant_id
    and m.puntos_historicos > 0
    and (
      m.puntos_historicos > v_puntos
      or (m.puntos_historicos = v_puntos and m.created_at < v_created)
    );

  return json_build_object('posicion', v_posicion, 'puntos', v_puntos, 'total', v_total);
end;
$$;

revoke execute on function public.get_ranking_posicion(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.get_ranking_posicion(uuid, uuid)
  to service_role, postgres;
