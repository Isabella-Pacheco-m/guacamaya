-- 0012_mes_cumpleanos.sql — pregunta de mes de cumpleaños del cliente.
--
-- Modelo "ofertas durante el mes de cumpleaños": pedimos SOLO el mes (1-12),
-- no fecha completa. Es más liviano para el cliente y suficiente para que
-- el negocio active campañas/ofertas mensuales segmentadas.
--
-- Coexiste con miembros.fecha_nacimiento (date, opcional, día+mes), que sigue
-- usándose por el cron diario regalar_cumpleanos_hoy() para regalo de puntos.
-- Esta feature (mes) se gatea con tenant_features.cumpleanos_enabled — el
-- negocio decide si pregunta o no.

alter table miembros
  add column if not exists mes_cumpleanos int;

alter table miembros
  add constraint mes_cumpleanos_valido
  check (mes_cumpleanos is null or (mes_cumpleanos between 1 and 12))
  not valid;

alter table miembros validate constraint mes_cumpleanos_valido;

create index if not exists idx_miembros_mes_cumple
  on miembros(tenant_id, mes_cumpleanos)
  where mes_cumpleanos is not null;

-- ============================================================
-- list_cumpleaneros_del_mes(p_tenant_id, p_mes) → admin ve candidatos para
-- campañas mensuales. Solo retorna miembros con mes_cumpleanos no nulo.
-- ============================================================
create or replace function public.list_cumpleaneros_del_mes(
  p_tenant_id uuid,
  p_mes       int
) returns setof miembros
language plpgsql
security invoker
as $$
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  if p_mes < 1 or p_mes > 12 then
    raise exception 'mes debe estar entre 1 y 12';
  end if;
  return query
    select *
    from miembros
    where tenant_id = p_tenant_id
      and mes_cumpleanos = p_mes
    order by nombre asc;
end;
$$;

-- ============================================================
-- set_mes_cumpleanos(p_tenant_id, p_miembro_id, p_mes) → cliente PWA
-- actualiza su propio mes. p_mes null limpia el valor.
-- ============================================================
create or replace function public.set_mes_cumpleanos(
  p_tenant_id  uuid,
  p_miembro_id uuid,
  p_mes        int
) returns miembros
language plpgsql
security invoker
as $$
declare
  v_row miembros;
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  if p_mes is not null and (p_mes < 1 or p_mes > 12) then
    raise exception 'mes debe estar entre 1 y 12';
  end if;
  update miembros
  set mes_cumpleanos = p_mes
  where id = p_miembro_id and tenant_id = p_tenant_id
  returning * into v_row;
  if not found then
    raise exception 'miembro no encontrado';
  end if;
  return v_row;
end;
$$;
