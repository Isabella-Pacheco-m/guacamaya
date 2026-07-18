-- 0035_caducar_puntos_set_based.sql — el barrido de caducidad, sin loop.
--
-- La versión de 0032 iteraba miembro por miembro con un agregado cada uno:
-- correcta, pero O(miembros × sus transacciones) con un roundtrip de plan por
-- fila. Esta la reemplaza por una sola pasada set-based: un agregado agrupado
-- sobre transacciones + insert masivo + update masivo vía CTEs.
--
-- La SEMÁNTICA no cambia (misma fórmula FIFO, misma nota, misma idempotencia
-- vía transacción negativa tipo CADUCIDAD, puntos_historicos intacto). El
-- arnés de smoke ejercita ambas versiones con los mismos casos.
--
-- Mejora adicional sobre 0032: el UPDATE clampa a >= 0 con greatest() por si
-- una compra/canje concurrente cruza entre el snapshot del agregado y el
-- update — antes ese race (raro: cron diario vs mostrador) podía dejar un
-- saldo negativo transitorio.

create or replace function public.caducar_puntos()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hoy_bogota date;
  v_miembros   int;
  v_puntos     bigint;
begin
  v_hoy_bogota := (now() at time zone 'America/Bogota')::date;

  with candidatos as (
    select
      m.id              as miembro_id,
      m.tenant_id       as tenant_id,
      m.puntos_actuales as puntos_actuales,
      t.puntos_caducidad_meses as meses
    from miembros m
    join tenants t on t.id = m.tenant_id
    where t.puntos_caducidad_meses is not null
      and m.puntos_actuales > 0
  ),
  agregados as (
    -- Misma fórmula FIFO de 0032: lo ganado antes del corte menos TODO lo
    -- consumido; el excedente positivo es lo que vence. Clampado al saldo.
    select
      c.miembro_id,
      c.tenant_id,
      c.meses,
      greatest(
        least(
          coalesce(sum(
            case
              when tr.puntos_delta > 0
               and tr.created_at < now() - make_interval(months => c.meses)
              then tr.puntos_delta
              else 0
            end
          ), 0)
          - coalesce(sum(
              case when tr.puntos_delta < 0 then -tr.puntos_delta else 0 end
            ), 0),
          c.puntos_actuales
        ),
        0
      ) as a_vencer
    from candidatos c
    left join transacciones tr
      on tr.tenant_id = c.tenant_id and tr.miembro_id = c.miembro_id
    group by c.miembro_id, c.tenant_id, c.meses, c.puntos_actuales
  ),
  vencibles as (
    select * from agregados where a_vencer > 0
  ),
  ins as (
    insert into transacciones (tenant_id, miembro_id, tipo, monto_cop, puntos_delta, nota)
    select
      v.tenant_id, v.miembro_id, 'CADUCIDAD', null, -v.a_vencer,
      'Puntos vencidos (' || v.meses::text || ' meses)'
    from vencibles v
  ),
  upd as (
    update miembros m
    set puntos_actuales = greatest(m.puntos_actuales - v.a_vencer, 0)
    from vencibles v
    where m.id = v.miembro_id
    returning v.a_vencer
  )
  select count(*)::int, coalesce(sum(a_vencer), 0)
  into v_miembros, v_puntos
  from upd;

  return json_build_object(
    'fecha',    v_hoy_bogota,
    'miembros', coalesce(v_miembros, 0),
    'puntos',   coalesce(v_puntos, 0)
  );
end;
$$;

revoke all on function public.caducar_puntos() from public;
revoke all on function public.caducar_puntos() from anon, authenticated;
grant execute on function public.caducar_puntos() to service_role, postgres;
