-- 0031_galeria_paginacion.sql — scroll infinito en la galería.
--
-- `list_galeria_aprobadas` gana paginación por keyset (`p_before`): en vez de
-- OFFSET —que se degrada y puede repetir/saltar filas si entran fotos nuevas
-- mientras el usuario hace scroll— se pide "lo anterior a este created_at".
-- Estable aunque la marca apruebe fotos en medio del scroll.
--
-- p_before null = primera página.

-- El tipo de retorno no cambia, pero sí la firma: hay que borrar la anterior.
drop function if exists public.list_galeria_aprobadas(uuid, int);

create or replace function public.list_galeria_aprobadas(
  p_tenant_id uuid,
  p_limit     int default 24,
  p_before    timestamptz default null
) returns table (
  id                 uuid,
  miembro_id         uuid,
  imagen_url         text,
  caption            text,
  created_at         timestamptz,
  miembro_nombre     text,
  miembro_avatar_url text
)
language plpgsql
security invoker
as $$
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  if p_limit < 1 then p_limit := 1; end if;
  if p_limit > 60 then p_limit := 60; end if;
  return query
    select g.id, g.miembro_id, g.imagen_url, g.caption, g.created_at,
           m.nombre, m.avatar_url
    from galeria_posts g
    join miembros m on m.id = g.miembro_id
    where g.tenant_id = p_tenant_id
      and g.estado = 'aprobado'
      and (p_before is null or g.created_at < p_before)
    order by g.created_at desc
    limit p_limit;
end;
$$;

-- Índice que sostiene el keyset (tenant + estado, ordenado por fecha desc).
create index if not exists idx_galeria_aprobadas_keyset
  on galeria_posts (tenant_id, estado, created_at desc);

revoke execute on function public.list_galeria_aprobadas(uuid, int, timestamptz)
  from public, anon, authenticated;
grant execute on function public.list_galeria_aprobadas(uuid, int, timestamptz)
  to service_role, postgres;
