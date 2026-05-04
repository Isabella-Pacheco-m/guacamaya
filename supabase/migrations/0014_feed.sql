-- 0014_feed.sql — feed de comunidad por tenant.
--
-- Posts publicados por el admin: título, cuerpo, imagen opcional y link
-- opcional con su label. Cliente PWA los ve en orden cronológico inverso.
-- Sin draft / publish — al crearse, el post es público.

create table if not exists feed_posts (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  titulo       text not null,
  cuerpo       text not null,
  imagen_url   text,
  link_url     text,
  link_label   text,
  autor_email  text,
  created_at   timestamptz not null default now()
);

alter table feed_posts enable row level security;

drop policy if exists tenant_isolation on feed_posts;
create policy tenant_isolation on feed_posts
  using (tenant_id = (current_setting('app.tenant_id'))::uuid);

create index if not exists idx_feed_posts_tenant_created
  on feed_posts(tenant_id, created_at desc);

-- ============================================================
-- list_feed_posts(p_tenant_id, p_limit) → orden descendente.
-- ============================================================
create or replace function public.list_feed_posts(
  p_tenant_id uuid,
  p_limit     int default 50
) returns setof feed_posts
language plpgsql
security invoker
as $$
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  if p_limit < 1 then p_limit := 1; end if;
  if p_limit > 200 then p_limit := 200; end if;
  return query
    select *
    from feed_posts
    where tenant_id = p_tenant_id
    order by created_at desc
    limit p_limit;
end;
$$;

-- ============================================================
-- create_feed_post(...) → inserta y retorna la fila.
-- ============================================================
create or replace function public.create_feed_post(
  p_tenant_id   uuid,
  p_titulo      text,
  p_cuerpo      text,
  p_imagen_url  text,
  p_link_url    text,
  p_link_label  text,
  p_autor_email text
) returns feed_posts
language plpgsql
security invoker
as $$
declare
  v_row feed_posts;
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  if p_titulo is null or length(trim(p_titulo)) = 0 then
    raise exception 'titulo no puede estar vacio';
  end if;
  if p_cuerpo is null or length(trim(p_cuerpo)) = 0 then
    raise exception 'cuerpo no puede estar vacio';
  end if;
  insert into feed_posts (
    tenant_id, titulo, cuerpo, imagen_url, link_url, link_label, autor_email
  ) values (
    p_tenant_id,
    trim(p_titulo),
    trim(p_cuerpo),
    nullif(trim(coalesce(p_imagen_url, '')), ''),
    nullif(trim(coalesce(p_link_url, '')), ''),
    nullif(trim(coalesce(p_link_label, '')), ''),
    nullif(trim(coalesce(p_autor_email, '')), '')
  ) returning * into v_row;
  return v_row;
end;
$$;

-- ============================================================
-- delete_feed_post(p_tenant_id, p_id) → retorna imagen_url para que el
-- caller pueda limpiar el archivo en storage. Lanza si no existe.
-- ============================================================
create or replace function public.delete_feed_post(
  p_tenant_id uuid,
  p_id        uuid
) returns text
language plpgsql
security invoker
as $$
declare
  v_imagen_url text;
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  delete from feed_posts
  where id = p_id and tenant_id = p_tenant_id
  returning imagen_url into v_imagen_url;
  if not found then
    raise exception 'post no encontrado';
  end if;
  return v_imagen_url;
end;
$$;
