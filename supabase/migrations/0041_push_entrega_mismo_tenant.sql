-- 0041_push_entrega_mismo_tenant.sql — atar la confirmación de entrega a su club.
--
-- `push_registrar_entrega` la llama el service worker del dispositivo a través
-- de /api/push/entregas, que NO lleva sesión a propósito: el worker se
-- despierta para recibir un push aunque no haya ninguna pestaña abierta ni
-- cookie vigente, y una entrega que no se puede confirmar por no poder
-- autenticarse sería justo el dato que hace falta.
--
-- Como contrapartida, la función tiene que defenderse sola. En 0040 aceptaba
-- cualquier pareja (endpoint, envío): quien conociera un endpoint podía sumar
-- confirmaciones al historial de OTRO club. Impacto pequeño —un contador
-- inflado, ningún dato expuesto— pero rompe el aislamiento por tenant que el
-- resto del sistema mantiene sin excepciones.
--
-- Ahora:
--   - un endpoint desconocido no hace absolutamente nada;
--   - el envío tiene que pertenecer al mismo club que la suscripción.

create or replace function push_registrar_entrega(
  p_endpoint text,
  p_envio_id uuid default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid;
  nuevas   int := 0;
begin
  -- Señal de vida del dispositivo, haya o no campaña asociada (también la
  -- deja la notificación de prueba). El endpoint es único global.
  update push_suscripciones
     set ultima_entrega = now()
   where endpoint = p_endpoint
  returning tenant_id into v_tenant;

  -- Endpoint que no tenemos registrado: nada que confirmar.
  if v_tenant is null or p_envio_id is null then
    return false;
  end if;

  -- La campaña debe ser del mismo club que el dispositivo.
  if not exists (
    select 1 from push_envios
     where id = p_envio_id and tenant_id = v_tenant
  ) then
    return false;
  end if;

  insert into push_entregas (envio_id, endpoint)
  values (p_envio_id, p_endpoint)
  on conflict do nothing;

  get diagnostics nuevas = row_count;
  if nuevas = 0 then
    return false;
  end if;

  update push_envios
     set entregados = entregados + 1
   where id = p_envio_id;

  return true;
end;
$$;

revoke all on function public.push_registrar_entrega(text, uuid) from public, anon, authenticated;
grant execute on function public.push_registrar_entrega(text, uuid) to service_role;
