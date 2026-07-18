-- 0023_miembro_avatar.sql — foto de perfil del miembro.
--
-- El cliente puede subir su propia foto de perfil desde la PWA. Se guarda en
-- Storage (prefijo tenants/<id>/miembros/<miembroId>/) y la URL pública queda
-- en miembros.avatar_url. Si es null, la UI muestra un avatar de iniciales.
--
-- Todas las RPC que devuelven miembro usan `select *` / `row_to_json`, así que
-- avatar_url fluye automáticamente por list_miembros, get_miembro_by_id,
-- get_miembro_by_auth0, register_compra, register_canje, register_sello,
-- set_mes_cumpleanos, redeem_invitacion, etc. Solo hace falta esta columna y la
-- RPC de seteo.

alter table miembros
  add column if not exists avatar_url text;

-- ============================================================
-- set_miembro_avatar(p_tenant_id, p_miembro_id, p_url) → miembro actualizado.
-- p_url null limpia la foto. Tenant-scoped (defensa ante service_role).
-- ============================================================
create or replace function public.set_miembro_avatar(
  p_tenant_id  uuid,
  p_miembro_id uuid,
  p_url        text
) returns miembros
language plpgsql
security invoker
as $$
declare
  v_row miembros;
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  update miembros
  set avatar_url = nullif(trim(coalesce(p_url, '')), '')
  where id = p_miembro_id and tenant_id = p_tenant_id
  returning * into v_row;
  if not found then
    raise exception 'miembro no encontrado';
  end if;
  return v_row;
end;
$$;

-- Acceso: solo service role (la app llama por el service role; anon/authenticated
-- quedan revocados igual que en 0020).
revoke execute on function public.set_miembro_avatar(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.set_miembro_avatar(uuid, uuid, text)
  to service_role, postgres;
