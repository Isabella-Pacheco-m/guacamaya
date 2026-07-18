-- 0027_notas.sql — Notas tipo post-it de la marca a su comunidad.
--
-- La marca deja notas cortas (texto + color pastel) que sus clientes ven en la
-- PWA como tarjetas post-it. Son del negocio (no de miembros). Una nota puede
-- fijarse (pinned) para mostrarse primero.

-- Flag de la funcionalidad.
alter table tenant_features
  add column if not exists notas_enabled boolean not null default false;

create table if not exists notas (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  cuerpo     text not null,
  color      text not null default 'amarillo',
  pinned     boolean not null default false,
  created_at timestamptz not null default now()
);

alter table notas
  drop constraint if exists notas_color_valido;
alter table notas
  add constraint notas_color_valido
  check (color in ('amarillo', 'rosa', 'verde', 'azul', 'lavanda')) not valid;
alter table notas validate constraint notas_color_valido;

create index if not exists idx_notas_tenant on notas (tenant_id, pinned desc, created_at desc);

alter table notas enable row level security;

drop policy if exists "tenant_isolation" on notas;
create policy "tenant_isolation" on notas
  using (tenant_id = (current_setting('app.tenant_id'))::uuid);

-- ============================================================
-- list_notas(p_tenant_id, p_limit) — fijadas primero, luego recientes.
-- ============================================================
create or replace function public.list_notas(
  p_tenant_id uuid,
  p_limit     int default 50
) returns setof notas
language plpgsql
security invoker
as $$
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  if p_limit < 1 then p_limit := 1; end if;
  if p_limit > 200 then p_limit := 200; end if;
  return query
    select *
    from notas
    where tenant_id = p_tenant_id
    order by pinned desc, created_at desc
    limit p_limit;
end;
$$;

-- ============================================================
-- create_nota(p_tenant_id, p_cuerpo, p_color, p_pinned) → nota creada.
-- ============================================================
create or replace function public.create_nota(
  p_tenant_id uuid,
  p_cuerpo    text,
  p_color     text,
  p_pinned    boolean
) returns notas
language plpgsql
security invoker
as $$
declare
  v_row notas;
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  if p_cuerpo is null or length(trim(p_cuerpo)) = 0 then
    raise exception 'cuerpo no puede estar vacio';
  end if;
  insert into notas (tenant_id, cuerpo, color, pinned)
  values (
    p_tenant_id,
    trim(p_cuerpo),
    coalesce(nullif(trim(coalesce(p_color, '')), ''), 'amarillo'),
    coalesce(p_pinned, false)
  )
  returning * into v_row;
  return v_row;
end;
$$;

-- ============================================================
-- delete_nota(p_tenant_id, p_id) → borra la nota del tenant.
-- ============================================================
create or replace function public.delete_nota(
  p_tenant_id uuid,
  p_id        uuid
) returns void
language plpgsql
security invoker
as $$
declare
  v_deleted int;
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  delete from notas where id = p_id and tenant_id = p_tenant_id;
  get diagnostics v_deleted = row_count;
  if v_deleted = 0 then
    raise exception 'nota no encontrada';
  end if;
end;
$$;

revoke execute on function public.list_notas(uuid, int) from public, anon, authenticated;
revoke execute on function public.create_nota(uuid, text, text, boolean) from public, anon, authenticated;
revoke execute on function public.delete_nota(uuid, uuid) from public, anon, authenticated;
grant execute on function public.list_notas(uuid, int) to service_role, postgres;
grant execute on function public.create_nota(uuid, text, text, boolean) to service_role, postgres;
grant execute on function public.delete_nota(uuid, uuid) to service_role, postgres;
