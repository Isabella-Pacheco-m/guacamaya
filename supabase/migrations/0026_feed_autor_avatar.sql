-- 0026_feed_autor_avatar.sql — foto del autor en el feed.
--
-- list_feed_posts pasa de `setof feed_posts` a `returns table(...)` para incluir
-- autor_avatar_url: la foto ACTUAL del miembro autor (join a miembros por
-- autor_miembro_id). Así el feed muestra la foto de perfil que el cliente subió.
-- Para posts del negocio (autor_miembro_id null) queda null y la UI usa el logo.
--
-- Nota: cambiamos el tipo de retorno (antes `setof feed_posts`), y Postgres no
-- permite hacerlo con CREATE OR REPLACE, así que se hace DROP + CREATE.

drop function if exists public.list_feed_posts(uuid, int);

create or replace function public.list_feed_posts(
  p_tenant_id uuid,
  p_limit     int default 50
) returns table (
  id               uuid,
  tenant_id        uuid,
  titulo           text,
  cuerpo           text,
  imagen_url       text,
  link_url         text,
  link_label       text,
  autor_email      text,
  autor_miembro_id uuid,
  autor_nombre     text,
  created_at       timestamptz,
  autor_avatar_url text
)
language plpgsql
security invoker
as $$
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  if p_limit < 1 then p_limit := 1; end if;
  if p_limit > 200 then p_limit := 200; end if;
  return query
    select
      f.id, f.tenant_id, f.titulo, f.cuerpo, f.imagen_url, f.link_url,
      f.link_label, f.autor_email, f.autor_miembro_id, f.autor_nombre,
      f.created_at, m.avatar_url
    from feed_posts f
    left join miembros m on m.id = f.autor_miembro_id
    where f.tenant_id = p_tenant_id
    order by f.created_at desc
    limit p_limit;
end;
$$;

revoke execute on function public.list_feed_posts(uuid, int)
  from public, anon, authenticated;
grant execute on function public.list_feed_posts(uuid, int)
  to service_role, postgres;
