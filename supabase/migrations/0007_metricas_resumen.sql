-- 0007_metricas_resumen.sql — agregados del panel admin (últimos N días).
--
-- Devuelve JSON con conteos y sumas en una sola RPC para evitar 5 round-trips.
-- Ventana = (now() - p_dias días, now()]. Se incluyen miembros creados,
-- transacciones de COMPRA y CANJE, y puntos emitidos/canjeados.
--
-- security invoker + set_config(app.tenant_id) — patrón estándar.

create or replace function public.get_metricas_resumen(
  p_tenant_id uuid,
  p_dias      int default 30
)
returns json
language plpgsql
security invoker
as $$
declare
  v_dias        int;
  v_desde       timestamptz;
  v_resultado   json;
begin
  v_dias  := greatest(1, least(coalesce(p_dias, 30), 365));
  v_desde := now() - (v_dias || ' days')::interval;

  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);

  with
    nuevos as (
      select count(*)::int as c
      from miembros
      where tenant_id = p_tenant_id
        and created_at >= v_desde
    ),
    compras as (
      select
        count(*)::int                     as c,
        coalesce(sum(monto_cop), 0)::int  as monto
      from transacciones
      where tenant_id = p_tenant_id
        and tipo = 'COMPRA'
        and created_at >= v_desde
    ),
    canjes as (
      select count(*)::int as c
      from transacciones
      where tenant_id = p_tenant_id
        and tipo = 'CANJE'
        and created_at >= v_desde
    ),
    puntos as (
      select
        coalesce(sum(case when puntos_delta > 0 then puntos_delta else 0 end), 0)::int   as emitidos,
        coalesce(sum(case when puntos_delta < 0 then -puntos_delta else 0 end), 0)::int  as canjeados
      from transacciones
      where tenant_id = p_tenant_id
        and created_at >= v_desde
    )
  select json_build_object(
    'dias',              v_dias,
    'desde',             v_desde,
    'miembros_nuevos',   (select c from nuevos),
    'compras_count',     (select c from compras),
    'compras_monto_cop', (select monto from compras),
    'canjes_count',      (select c from canjes),
    'puntos_emitidos',   (select emitidos from puntos),
    'puntos_canjeados',  (select canjeados from puntos)
  ) into v_resultado;

  return v_resultado;
end;
$$;
