-- 0037_mes_cumpleanos_compartido.sql — el mes de cumpleaños es de la persona,
-- no del club.
--
-- Un mismo usuario (auth0_user_id) puede ser miembro de varias comunidades
-- (unique (tenant_id, auth0_user_id) desde 0005). Hasta ahora cada fila de
-- `miembros` guardaba su propio mes_cumpleanos: quien estaba en dos clubes
-- veía el prompt dos veces y podía declarar meses distintos. Ahora el mes se
-- define UNA sola vez por identidad y se comparte:
--
--   - al definirlo en un club, se copia a todas sus membresías;
--   - al unirse a un club nuevo (self-register o invitación), la fila nueva
--     nace con el mes que ya declaró en otro club;
--   - la regla "solo una vez" (0017) pasa a ser por identidad, no por fila.
--
-- Cada tenant sigue leyendo solo sus filas (list_cumpleaneros_del_mes queda
-- intacta) y el prompt solo aparece donde cumpleanos_enabled está ON. Las
-- escrituras cruzan tenants a propósito — son de la misma persona — y corren
-- con service_role (bypassa RLS), como todo acceso de la app.

-- Lookup por identidad (también acelera findMiembroByAuth0, que hoy filtra
-- por auth0_user_id sin índice propio: el unique de 0005 empieza por tenant).
create index if not exists idx_miembros_auth0_user_id
  on miembros (auth0_user_id)
  where auth0_user_id is not null;

-- ============================================================
-- sync_mes_cumpleanos_identidad(p_auth0_user_id) → int
--
-- Copia el mes ya definido — el de la membresía más antigua que lo tenga,
-- es decir, "la primera vez que lo señaló" — a las filas de la identidad que
-- aún no lo tienen. Nunca pisa un mes ya guardado. Devuelve el mes de
-- referencia, o null si la identidad no ha declarado ninguno.
-- ============================================================
create or replace function public.sync_mes_cumpleanos_identidad(
  p_auth0_user_id text
) returns int
language plpgsql
security invoker
as $$
declare
  v_mes int;
begin
  if p_auth0_user_id is null then
    return null;
  end if;

  select mes_cumpleanos into v_mes
  from miembros
  where auth0_user_id = p_auth0_user_id
    and mes_cumpleanos is not null
  order by created_at asc
  limit 1;

  if v_mes is null then
    return null;
  end if;

  update miembros
  set mes_cumpleanos = v_mes
  where auth0_user_id = p_auth0_user_id
    and mes_cumpleanos is null;

  return v_mes;
end;
$$;

revoke execute on function public.sync_mes_cumpleanos_identidad(text)
  from public, anon, authenticated;
grant execute on function public.sync_mes_cumpleanos_identidad(text)
  to service_role, postgres;

-- ============================================================
-- set_mes_cumpleanos — ahora identity-aware.
--
-- Si la persona ya declaró su mes en otro club (fila local desincronizada,
-- p.ej. anterior a esta migración), no se lanza error: se sincroniza la fila
-- con ese mes y se devuelve — el intento de poner otro mes no aplica, igual
-- que un cambio. La API/PWA muestran el mes devuelto.
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
  v_row           miembros;
  v_mes_identidad int;
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  if p_mes is not null and (p_mes < 1 or p_mes > 12) then
    raise exception 'mes debe estar entre 1 y 12';
  end if;

  select * into v_row
  from miembros
  where id = p_miembro_id and tenant_id = p_tenant_id;
  if not found then
    raise exception 'miembro no encontrado';
  end if;

  -- Cambio único (0017), ahora por identidad: definido una vez, no se toca.
  if v_row.mes_cumpleanos is not null then
    raise exception 'mes ya definido';
  end if;

  if v_row.auth0_user_id is not null then
    v_mes_identidad := sync_mes_cumpleanos_identidad(v_row.auth0_user_id);
    if v_mes_identidad is not null then
      select * into v_row from miembros where id = p_miembro_id;
      return v_row;
    end if;
  end if;

  update miembros
  set mes_cumpleanos = p_mes
  where id = p_miembro_id and tenant_id = p_tenant_id
  returning * into v_row;

  -- Compartir el mes recién declarado con sus demás membresías.
  if p_mes is not null and v_row.auth0_user_id is not null then
    update miembros
    set mes_cumpleanos = p_mes
    where auth0_user_id = v_row.auth0_user_id
      and mes_cumpleanos is null;
  end if;

  return v_row;
end;
$$;

-- ============================================================
-- redeem_invitacion — igual que 0005, más la sincronización del mes al
-- vincular la cuenta: la fila que el admin creó a mano hereda el mes que la
-- persona ya declaró en otro club (y viceversa: si el admin ya lo había
-- anotado aquí, se comparte con sus otras membresías sin mes).
-- ============================================================
create or replace function public.redeem_invitacion(
  p_tenant_id      uuid,
  p_token_hash     text,
  p_auth0_user_id  text
) returns json
language plpgsql
security invoker
as $$
declare
  v_invitacion invitaciones;
  v_miembro    miembros;
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);

  select * into v_invitacion
  from invitaciones
  where tenant_id = p_tenant_id and token_hash = p_token_hash
  for update;

  if not found then
    raise exception 'invitacion no encontrada';
  end if;

  if v_invitacion.used_at is not null then
    raise exception 'invitacion ya canjeada';
  end if;

  if v_invitacion.expires_at < now() then
    raise exception 'invitacion expirada';
  end if;

  select * into v_miembro
  from miembros
  where id = v_invitacion.miembro_id and tenant_id = p_tenant_id
  for update;

  if v_miembro.auth0_user_id is not null
     and v_miembro.auth0_user_id <> p_auth0_user_id then
    raise exception 'miembro ya vinculado a otro usuario';
  end if;

  if exists (
    select 1 from miembros
    where tenant_id = p_tenant_id
      and auth0_user_id = p_auth0_user_id
      and id <> v_miembro.id
  ) then
    raise exception 'auth0 user ya tiene un miembro en este tenant';
  end if;

  update miembros
  set auth0_user_id = p_auth0_user_id
  where id = v_miembro.id;

  update invitaciones
  set used_at = now(), used_by_auth0_user_id = p_auth0_user_id
  where id = v_invitacion.id;

  perform sync_mes_cumpleanos_identidad(p_auth0_user_id);

  select * into v_miembro from miembros where id = v_miembro.id;

  return json_build_object('miembro', row_to_json(v_miembro));
end;
$$;

-- ============================================================
-- Backfill — comparte el mes ya declarado con las membresías que no lo
-- tienen. Referencia: el de la membresía más antigua con mes. Si una persona
-- alcanzó a declarar meses distintos en dos clubes, no se pisa ninguno.
-- ============================================================
update miembros m
set mes_cumpleanos = ref.mes_cumpleanos
from (
  select distinct on (auth0_user_id) auth0_user_id, mes_cumpleanos
  from miembros
  where auth0_user_id is not null and mes_cumpleanos is not null
  order by auth0_user_id, created_at asc
) ref
where m.auth0_user_id = ref.auth0_user_id
  and m.mes_cumpleanos is null;
