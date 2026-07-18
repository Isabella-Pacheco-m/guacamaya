-- 0032_caducidad_puntos.sql — vencimiento configurable de puntos.
--
-- Modelo:
--   tenants.puntos_caducidad_meses (int, nullable)
--     null → los puntos NUNCA vencen (default, comportamiento actual).
--     3|6|12 → un punto vence ese número de meses después de haberse ganado.
--
-- Consumo FIFO. No guardamos "lotes" de puntos en una tabla aparte: el saldo
-- ya es derivable de `transacciones`, así que el lote más viejo se calcula
-- sobre la marcha. Para un miembro:
--
--   ganados_viejos = suma de puntos_delta > 0 con created_at < corte
--   consumidos     = suma de |puntos_delta| < 0 (canjes, ajustes, vencimientos)
--   a_vencer       = max(ganados_viejos - consumidos, 0)
--
-- Como todo consumo se descuenta primero del lote más viejo (FIFO), restar el
-- consumo total del acumulado viejo da exactamente lo que queda sin usar de
-- ese tramo. El vencimiento se registra como transacción NEGATIVA, así que en
-- la siguiente corrida ya cuenta como consumido: la función es idempotente y
-- se puede correr N veces al día sin descontar de más.
--
-- `puntos_historicos` NO se toca: el nivel (BRONCE/PLATA/ORO) es un logro
-- acumulado y no se pierde porque venzan puntos gastables.
--
-- El cron diario llama public.caducar_puntos() con el rol service_role
-- (ver app/api/cron/puntos-caducidad/route.ts y vercel.json).

alter table tenants
  add column if not exists puntos_caducidad_meses int;

alter table tenants
  drop constraint if exists puntos_caducidad_meses_valido;

alter table tenants
  add constraint puntos_caducidad_meses_valido
  check (puntos_caducidad_meses is null or puntos_caducidad_meses in (3, 6, 12))
  not valid;

alter table tenants validate constraint puntos_caducidad_meses_valido;

-- Sostiene el barrido del cron y el cálculo por miembro.
create index if not exists idx_transacciones_miembro_created
  on transacciones (tenant_id, miembro_id, created_at);

-- =====================================================================
-- Cron diario: vence lo que ya cumplió su plazo
-- =====================================================================
--
-- SECURITY DEFINER: recorre TODOS los tenants en una pasada, así que no puede
-- apoyarse en set_config('app.tenant_id') (que cubre un solo tenant). Solo la
-- invoca el cron autenticado con CRON_SECRET. Mismo patrón que
-- regalar_cumpleanos_hoy() en 0008_cumpleanos.sql.
create or replace function public.caducar_puntos()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hoy_bogota date;
  v_miembros   int := 0;
  v_puntos     bigint := 0;
  v_a_vencer   bigint;
  v_nota       text;
  r            record;
begin
  v_hoy_bogota := (now() at time zone 'America/Bogota')::date;

  for r in
    select
      m.id                        as miembro_id,
      m.tenant_id                 as tenant_id,
      m.puntos_actuales           as puntos_actuales,
      t.puntos_caducidad_meses    as meses
    from miembros m
    join tenants  t on t.id = m.tenant_id
    where t.puntos_caducidad_meses is not null
      and m.puntos_actuales > 0
  loop
    select greatest(
             coalesce(sum(
               case
                 when tr.puntos_delta > 0
                  and tr.created_at < now() - make_interval(months => r.meses)
                 then tr.puntos_delta
                 else 0
               end
             ), 0)
             - coalesce(sum(
                 case when tr.puntos_delta < 0 then -tr.puntos_delta else 0 end
               ), 0),
             0
           )
    into v_a_vencer
    from transacciones tr
    where tr.tenant_id  = r.tenant_id
      and tr.miembro_id = r.miembro_id;

    -- Red de seguridad: nunca dejar el saldo en negativo aunque el histórico
    -- de transacciones y puntos_actuales se hayan desincronizado.
    v_a_vencer := least(v_a_vencer, r.puntos_actuales);
    if v_a_vencer <= 0 then
      continue;
    end if;

    v_nota := 'Puntos vencidos (' || r.meses::text || ' meses)';

    insert into transacciones (tenant_id, miembro_id, tipo, monto_cop, puntos_delta, nota)
    values (r.tenant_id, r.miembro_id, 'CADUCIDAD', null, -v_a_vencer, v_nota);

    -- Solo el saldo gastable. puntos_historicos y nivel se conservan.
    update miembros
    set puntos_actuales = puntos_actuales - v_a_vencer
    where id = r.miembro_id;

    v_miembros := v_miembros + 1;
    v_puntos   := v_puntos + v_a_vencer;
  end loop;

  return json_build_object(
    'fecha',    v_hoy_bogota,
    'miembros', v_miembros,
    'puntos',   v_puntos
  );
end;
$$;

revoke all on function public.caducar_puntos() from public;
revoke all on function public.caducar_puntos() from anon, authenticated;
grant execute on function public.caducar_puntos() to service_role, postgres;

-- =====================================================================
-- PWA: "te vencen X puntos el DD/MM"
-- =====================================================================
--
-- Camina los lotes ganados de más viejo a más nuevo descontando el consumo
-- total (FIFO). El primer lote que sobrevive es el próximo en vencer.
-- Devuelve { meses, puntos, fecha }; puntos = 0 y fecha = null si el tenant
-- no tiene caducidad configurada o al miembro no le vence nada.
create or replace function public.get_proxima_caducidad(
  p_tenant_id  uuid,
  p_miembro_id uuid
) returns json
language plpgsql
security invoker
as $$
declare
  v_meses     int;
  v_consumido bigint;
  r           record;
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);

  select puntos_caducidad_meses into v_meses
  from tenants
  where id = p_tenant_id;

  if v_meses is null then
    return json_build_object('meses', null, 'puntos', 0, 'fecha', null);
  end if;

  select coalesce(sum(-puntos_delta), 0) into v_consumido
  from transacciones
  where tenant_id  = p_tenant_id
    and miembro_id = p_miembro_id
    and puntos_delta < 0;

  -- Agrupado por día: dos compras del mismo día vencen juntas, así el aviso
  -- de la PWA no parte un mismo día en dos fechas idénticas.
  for r in
    select
      (created_at at time zone 'America/Bogota')::date as dia,
      sum(puntos_delta)                                as puntos
    from transacciones
    where tenant_id  = p_tenant_id
      and miembro_id = p_miembro_id
      and puntos_delta > 0
    group by 1
    order by 1
  loop
    if v_consumido >= r.puntos then
      v_consumido := v_consumido - r.puntos;
    else
      return json_build_object(
        'meses',  v_meses,
        'puntos', r.puntos - v_consumido,
        'fecha',  (r.dia + make_interval(months => v_meses))::date
      );
    end if;
  end loop;

  return json_build_object('meses', v_meses, 'puntos', 0, 'fecha', null);
end;
$$;

revoke execute on function public.get_proxima_caducidad(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.get_proxima_caducidad(uuid, uuid)
  to service_role, postgres;
