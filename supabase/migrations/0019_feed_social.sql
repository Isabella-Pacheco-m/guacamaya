-- 0019_feed_social.sql — feed estilo red social.
--
-- Cambios:
--   - feed_posts.titulo pasa a opcional (los posts de miembros no llevan
--     título; los del negocio pueden seguir usándolo).
--   - feed_posts.autor_miembro_id / autor_nombre — autoría. Si autor_miembro_id
--     es null el post es del negocio (se muestra con su nombre/logo); si no,
--     es de un miembro (se muestra autor_nombre).
--   - tenant_features.feed_miembros_pueden_publicar — el admin decide si los
--     miembros también pueden publicar. Default false.
--   - create_feed_post_miembro(...) — alta de post hecha por un miembro.

alter table feed_posts alter column titulo drop not null;

alter table feed_posts
  add column if not exists autor_miembro_id uuid references miembros(id) on delete set null;

alter table feed_posts
  add column if not exists autor_nombre text;

create index if not exists idx_feed_posts_autor_miembro
  on feed_posts(tenant_id, autor_miembro_id);

alter table tenant_features
  add column if not exists feed_miembros_pueden_publicar boolean not null default false;

-- ============================================================
-- create_feed_post_miembro(p_tenant_id, p_miembro_id, p_nombre, p_cuerpo,
-- p_imagen_url) → post publicado por un miembro. Sin título ni link.
-- ============================================================
create or replace function public.create_feed_post_miembro(
  p_tenant_id  uuid,
  p_miembro_id uuid,
  p_nombre     text,
  p_cuerpo     text,
  p_imagen_url text
) returns feed_posts
language plpgsql
security invoker
as $$
declare
  v_row feed_posts;
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  if p_cuerpo is null or length(trim(p_cuerpo)) = 0 then
    raise exception 'cuerpo no puede estar vacio';
  end if;
  -- El miembro debe pertenecer al tenant.
  if not exists (
    select 1 from miembros
    where id = p_miembro_id and tenant_id = p_tenant_id
  ) then
    raise exception 'miembro no encontrado';
  end if;
  insert into feed_posts (
    tenant_id, titulo, cuerpo, imagen_url, autor_miembro_id, autor_nombre
  ) values (
    p_tenant_id,
    null,
    trim(p_cuerpo),
    nullif(trim(coalesce(p_imagen_url, '')), ''),
    p_miembro_id,
    nullif(trim(coalesce(p_nombre, '')), '')
  ) returning * into v_row;
  return v_row;
end;
$$;
