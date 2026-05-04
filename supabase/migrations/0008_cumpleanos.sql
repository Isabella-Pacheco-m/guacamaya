-- 0008_cumpleanos.sql — regalo de puntos por cumpleaños.
--
-- Modelo:
--   tenants.puntos_cumpleanos (int, nullable)
--     null o 0 → el negocio NO regala puntos por cumpleaños (opt-in).
--     >0       → cada miembro recibe ese monto el día de su cumpleaños.
--
-- El cron diario llama public.regalar_cumpleanos_hoy() con el rol service_role.
-- La función itera sobre todos los tenants con puntos_cumpleanos configurado
-- y miembros cuya fecha_nacimiento coincide con la fecha de hoy en Bogotá.
--
-- Idempotencia: antes de regalar, verifica que no exista ya una transacción
--   tipo='CUMPLEANOS' con nota='Cumpleaños YYYY' del año actual para ese miembro.
--   Si el cron corre dos veces el mismo día, la segunda llamada es no-op.
--
-- Uso de SECURITY DEFINER: la función necesita escribir a través de RLS para
-- múltiples tenants en una sola pasada — no podemos usar set_config('app.tenant_id')
-- porque cubre N tenants. Solo el cron (autenticado vía CRON_SECRET) la invoca.

alter table tenants
  add column if not exists puntos_cumpleanos int;

alter table tenants
  add constraint puntos_cumpleanos_no_negativo
  check (puntos_cumpleanos is null or puntos_cumpleanos >= 0)
  not valid;

alter table tenants validate constraint puntos_cumpleanos_no_negativo;

create or replace function public.regalar_cumpleanos_hoy()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hoy_bogota date;
  v_anio       int;
  v_nota       text;
  v_count      int := 0;
  r            record;
begin
  v_hoy_bogota := (now() at time zone 'America/Bogota')::date;
  v_anio       := extract(year from v_hoy_bogota)::int;
  v_nota       := 'Cumpleaños ' || v_anio::text;

  for r in
    select
      m.id           as miembro_id,
      m.tenant_id    as tenant_id,
      t.puntos_cumpleanos as puntos
    from miembros m
    join tenants  t on t.id = m.tenant_id
    where t.puntos_cumpleanos is not null
      and t.puntos_cumpleanos > 0
      and m.fecha_nacimiento is not null
      and extract(month from m.fecha_nacimiento) = extract(month from v_hoy_bogota)
      and extract(day   from m.fecha_nacimiento) = extract(day   from v_hoy_bogota)
      and not exists (
        select 1
        from transacciones tr
        where tr.tenant_id  = m.tenant_id
          and tr.miembro_id = m.id
          and tr.tipo       = 'CUMPLEANOS'
          and tr.nota       = v_nota
      )
  loop
    insert into transacciones (tenant_id, miembro_id, tipo, monto_cop, puntos_delta, nota)
    values (r.tenant_id, r.miembro_id, 'CUMPLEANOS', null, r.puntos, v_nota);

    update miembros
    set
      puntos_actuales   = puntos_actuales   + r.puntos,
      puntos_historicos = puntos_historicos + r.puntos,
      nivel = case
        when puntos_historicos + r.puntos >= 2000 then 'ORO'
        when puntos_historicos + r.puntos >= 500  then 'PLATA'
        else 'BRONCE'
      end
    where id = r.miembro_id;

    v_count := v_count + 1;
  end loop;

  return json_build_object(
    'fecha',     v_hoy_bogota,
    'regalados', v_count
  );
end;
$$;

revoke all on function public.regalar_cumpleanos_hoy() from public;
revoke all on function public.regalar_cumpleanos_hoy() from anon, authenticated;
