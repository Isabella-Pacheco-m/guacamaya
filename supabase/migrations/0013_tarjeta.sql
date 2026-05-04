-- 0013_tarjeta.sql — tarjeta de fidelización (sellos manuales).
--
-- Modelo paralelo a puntos:
--   - tenant_features.tarjeta_size — espacios de la tarjeta (1-100)
--   - tenant_features.sello_valor_cop — informacional ("$X = 1 sello"); el
--     admin sigue agregando sellos manualmente desde la página del miembro
--   - tarjeta_premios(tenant_id, threshold, descripcion) — admin define
--     premios para distintos umbrales de sellos
--   - miembros.sellos_actuales — progreso del ciclo activo
--   - miembros.tarjeta_ciclo — ciclo actual; +1 al canjear el premio máximo
--   - tarjeta_canjes — registra qué premios canjeó el miembro en cada ciclo
--     (un premio se puede canjear una sola vez por ciclo)
--
-- Reglas de canje:
--   - Premio en umbral T se puede canjear si sellos_actuales >= T y no se
--     canjeó en el ciclo actual.
--   - Si T == tarjeta_size (último): sellos_actuales=0, tarjeta_ciclo+=1.
--   - Si T < tarjeta_size: solo se loggea, no resetea.

-- ============================================================
-- tenant_features: tamaño y valor del sello
-- ============================================================
alter table tenant_features
  add column if not exists tarjeta_size int not null default 10;

alter table tenant_features
  add column if not exists sello_valor_cop int;

alter table tenant_features
  drop constraint if exists tarjeta_size_valido;
alter table tenant_features
  add constraint tarjeta_size_valido
  check (tarjeta_size between 1 and 100) not valid;
alter table tenant_features validate constraint tarjeta_size_valido;

alter table tenant_features
  drop constraint if exists sello_valor_cop_valido;
alter table tenant_features
  add constraint sello_valor_cop_valido
  check (sello_valor_cop is null or sello_valor_cop > 0) not valid;
alter table tenant_features validate constraint sello_valor_cop_valido;

-- ============================================================
-- miembros: contador y ciclo
-- ============================================================
alter table miembros
  add column if not exists sellos_actuales int not null default 0;

alter table miembros
  add column if not exists tarjeta_ciclo int not null default 0;

alter table miembros
  drop constraint if exists sellos_actuales_no_negativo;
alter table miembros
  add constraint sellos_actuales_no_negativo
  check (sellos_actuales >= 0) not valid;
alter table miembros validate constraint sellos_actuales_no_negativo;

-- ============================================================
-- tarjeta_premios — config por tenant
-- ============================================================
create table if not exists tarjeta_premios (
  tenant_id   uuid not null references tenants(id) on delete cascade,
  threshold   int  not null,
  descripcion text not null,
  created_at  timestamptz not null default now(),
  primary key (tenant_id, threshold),
  constraint threshold_positivo check (threshold > 0)
);

-- Acceso solo por service-role (bypassa RLS); igual que tenant_features.
alter table tarjeta_premios disable row level security;

-- ============================================================
-- tarjeta_canjes — historial de premios canjeados por miembro/ciclo
-- ============================================================
create table if not exists tarjeta_canjes (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id),
  miembro_id  uuid not null references miembros(id),
  threshold   int  not null,
  ciclo       int  not null,
  created_at  timestamptz not null default now(),
  unique (tenant_id, miembro_id, ciclo, threshold)
);

alter table tarjeta_canjes enable row level security;

drop policy if exists tenant_isolation on tarjeta_canjes;
create policy tenant_isolation on tarjeta_canjes
  using (tenant_id = (current_setting('app.tenant_id'))::uuid);

create index if not exists idx_tarjeta_canjes_miembro
  on tarjeta_canjes(tenant_id, miembro_id, ciclo);

-- ============================================================
-- register_sello(p_tenant_id, p_miembro_id, p_count default 1) →
-- incrementa sellos_actuales y registra una transaccion tipo 'SELLO'.
-- ============================================================
create or replace function public.register_sello(
  p_tenant_id  uuid,
  p_miembro_id uuid,
  p_count      int default 1
) returns miembros
language plpgsql
security invoker
as $$
declare
  v_row miembros;
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  if p_count is null or p_count <= 0 then
    raise exception 'count debe ser positivo';
  end if;

  update miembros
  set sellos_actuales = sellos_actuales + p_count
  where id = p_miembro_id and tenant_id = p_tenant_id
  returning * into v_row;
  if not found then
    raise exception 'miembro no encontrado';
  end if;

  insert into transacciones (tenant_id, miembro_id, tipo, puntos_delta, nota)
  values (
    p_tenant_id,
    p_miembro_id,
    'SELLO',
    0,
    'sellos +' || p_count::text
  );

  return v_row;
end;
$$;

-- ============================================================
-- redeem_premio_tarjeta(p_tenant_id, p_miembro_id, p_threshold) →
-- canjea un premio. Si threshold == tarjeta_size: resetea sellos y +1 ciclo.
-- ============================================================
create or replace function public.redeem_premio_tarjeta(
  p_tenant_id  uuid,
  p_miembro_id uuid,
  p_threshold  int
) returns miembros
language plpgsql
security invoker
as $$
declare
  v_row miembros;
  v_max_threshold int;
  v_descripcion text;
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);

  select * into v_row
  from miembros
  where id = p_miembro_id and tenant_id = p_tenant_id;
  if not found then
    raise exception 'miembro no encontrado';
  end if;

  select descripcion into v_descripcion
  from tarjeta_premios
  where tenant_id = p_tenant_id and threshold = p_threshold;
  if not found then
    raise exception 'premio no encontrado';
  end if;

  if v_row.sellos_actuales < p_threshold then
    raise exception 'sellos insuficientes';
  end if;

  -- Premio ya canjeado en el ciclo actual
  if exists (
    select 1 from tarjeta_canjes
    where tenant_id = p_tenant_id
      and miembro_id = p_miembro_id
      and ciclo = v_row.tarjeta_ciclo
      and threshold = p_threshold
  ) then
    raise exception 'premio ya canjeado en este ciclo';
  end if;

  insert into tarjeta_canjes (tenant_id, miembro_id, threshold, ciclo)
  values (p_tenant_id, p_miembro_id, p_threshold, v_row.tarjeta_ciclo);

  insert into transacciones (tenant_id, miembro_id, tipo, puntos_delta, nota)
  values (
    p_tenant_id,
    p_miembro_id,
    'SELLO_CANJE',
    0,
    'premio ' || p_threshold::text || ': ' || v_descripcion
  );

  -- Si es el umbral más alto (= tarjeta_size), resetea ciclo
  select tarjeta_size into v_max_threshold
  from tenant_features where tenant_id = p_tenant_id;
  if v_max_threshold is null then v_max_threshold := 10; end if;

  if p_threshold >= v_max_threshold then
    update miembros
    set sellos_actuales = 0,
        tarjeta_ciclo   = tarjeta_ciclo + 1
    where id = p_miembro_id and tenant_id = p_tenant_id
    returning * into v_row;
  end if;

  return v_row;
end;
$$;

-- ============================================================
-- list_tarjeta_premios(p_tenant_id) → admin: lista de premios configurados.
-- ============================================================
create or replace function public.list_tarjeta_premios(
  p_tenant_id uuid
) returns table(
  threshold   int,
  descripcion text
)
language plpgsql
security invoker
as $$
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  return query
    select p.threshold, p.descripcion
    from tarjeta_premios p
    where p.tenant_id = p_tenant_id
    order by p.threshold asc;
end;
$$;

-- ============================================================
-- list_tarjeta_premios_for_miembro(p_tenant_id, p_miembro_id) →
-- premios + estado (alcanzado, canjeado en ciclo actual).
-- ============================================================
create or replace function public.list_tarjeta_premios_for_miembro(
  p_tenant_id  uuid,
  p_miembro_id uuid
) returns table(
  threshold   int,
  descripcion text,
  alcanzado   boolean,
  canjeado    boolean
)
language plpgsql
security invoker
as $$
declare
  v_sellos int;
  v_ciclo  int;
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);

  select sellos_actuales, tarjeta_ciclo into v_sellos, v_ciclo
  from miembros
  where id = p_miembro_id and tenant_id = p_tenant_id;
  if not found then
    raise exception 'miembro no encontrado';
  end if;

  return query
    select
      p.threshold,
      p.descripcion,
      v_sellos >= p.threshold,
      exists(
        select 1 from tarjeta_canjes c
        where c.tenant_id  = p_tenant_id
          and c.miembro_id = p_miembro_id
          and c.ciclo      = v_ciclo
          and c.threshold  = p.threshold
      )
    from tarjeta_premios p
    where p.tenant_id = p_tenant_id
    order by p.threshold asc;
end;
$$;

-- ============================================================
-- upsert_tarjeta_premio(p_tenant_id, p_threshold, p_descripcion)
-- ============================================================
create or replace function public.upsert_tarjeta_premio(
  p_tenant_id   uuid,
  p_threshold   int,
  p_descripcion text
) returns void
language plpgsql
security invoker
as $$
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  if p_threshold is null or p_threshold <= 0 then
    raise exception 'threshold debe ser positivo';
  end if;
  if p_descripcion is null or length(trim(p_descripcion)) = 0 then
    raise exception 'descripcion no puede estar vacia';
  end if;
  insert into tarjeta_premios (tenant_id, threshold, descripcion)
  values (p_tenant_id, p_threshold, trim(p_descripcion))
  on conflict (tenant_id, threshold)
  do update set descripcion = excluded.descripcion;
end;
$$;

-- ============================================================
-- delete_tarjeta_premio(p_tenant_id, p_threshold)
-- ============================================================
create or replace function public.delete_tarjeta_premio(
  p_tenant_id uuid,
  p_threshold int
) returns void
language plpgsql
security invoker
as $$
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  delete from tarjeta_premios
  where tenant_id = p_tenant_id and threshold = p_threshold;
end;
$$;
