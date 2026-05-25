-- 0017_mes_cumpleanos_once.sql — el cliente define su mes de cumpleaños UNA
-- sola vez.
--
-- Motivo: las ofertas/regalos del mes de cumpleaños son un beneficio. Si el
-- cliente pudiera cambiar su mes libremente, podría rotarlo para reclamar el
-- beneficio en varios meses. Por eso, una vez definido (mes_cumpleanos no
-- nulo), set_mes_cumpleanos lo bloquea. La corrección de un mes mal puesto
-- queda como acción manual del admin/soporte sobre la tabla, no del cliente.

create or replace function public.set_mes_cumpleanos(
  p_tenant_id  uuid,
  p_miembro_id uuid,
  p_mes        int
) returns miembros
language plpgsql
security invoker
as $$
declare
  v_row    miembros;
  v_actual int;
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  if p_mes is not null and (p_mes < 1 or p_mes > 12) then
    raise exception 'mes debe estar entre 1 y 12';
  end if;

  select mes_cumpleanos into v_actual
  from miembros
  where id = p_miembro_id and tenant_id = p_tenant_id;
  if not found then
    raise exception 'miembro no encontrado';
  end if;

  -- Cambio único: si ya hay un mes definido, no se permite modificarlo.
  if v_actual is not null then
    raise exception 'mes ya definido';
  end if;

  update miembros
  set mes_cumpleanos = p_mes
  where id = p_miembro_id and tenant_id = p_tenant_id
  returning * into v_row;
  return v_row;
end;
$$;
