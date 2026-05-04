-- 0003_register_compra.sql — Guacamaya
-- RPC atómica para registrar una compra:
--   1. Lockea la fila del miembro (SELECT ... FOR UPDATE) → evita race con otras compras
--   2. Calcula puntos = (monto_cop / 1000) * tenant.puntos_por_mil
--   3. Suma a puntos_actuales y puntos_historicos
--   4. Recalcula nivel desde puntos_historicos
--   5. Inserta transaccion tipo 'COMPRA'
--   6. Retorna json { miembro, transaccion }
--
-- IMPORTANTE: la fórmula de puntos (calcularPuntos) y los umbrales de nivel
-- (calcularNivel: PLATA >= 500, ORO >= 2000) están duplicados en lib/business.ts.
-- Si cambian acá, actualizar lib/business.ts también.

create or replace function public.register_compra(
  p_tenant_id  uuid,
  p_miembro_id uuid,
  p_monto_cop  int
)
returns json
language plpgsql
security invoker
as $$
declare
  v_puntos_por_mil int;
  v_puntos         int;
  v_miembro        miembros;
  v_transaccion    transacciones;
begin
  if p_monto_cop is null or p_monto_cop <= 0 then
    raise exception 'monto_cop debe ser positivo';
  end if;

  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);

  -- Tenant config
  select puntos_por_mil into v_puntos_por_mil
  from tenants
  where id = p_tenant_id;
  if v_puntos_por_mil is null then
    raise exception 'tenant no encontrado';
  end if;

  v_puntos := (p_monto_cop / 1000) * v_puntos_por_mil;

  -- Lockear miembro
  select *
  into v_miembro
  from miembros
  where id = p_miembro_id
    and tenant_id = p_tenant_id
  for update;
  if v_miembro.id is null then
    raise exception 'miembro no encontrado';
  end if;

  -- Aplicar delta y recomputar nivel
  update miembros
  set
    puntos_actuales   = puntos_actuales + v_puntos,
    puntos_historicos = puntos_historicos + v_puntos,
    nivel = case
      when puntos_historicos + v_puntos >= 2000 then 'ORO'
      when puntos_historicos + v_puntos >= 500  then 'PLATA'
      else 'BRONCE'
    end
  where id = p_miembro_id
  returning * into v_miembro;

  -- Registrar transaccion
  insert into transacciones (tenant_id, miembro_id, tipo, monto_cop, puntos_delta)
  values (p_tenant_id, p_miembro_id, 'COMPRA', p_monto_cop, v_puntos)
  returning * into v_transaccion;

  return json_build_object(
    'miembro',     row_to_json(v_miembro),
    'transaccion', row_to_json(v_transaccion)
  );
end;
$$;
