-- 0034_indices_transacciones.sql — índice compuesto para la tabla que más crece.
--
-- `transacciones` es append-only y crece con cada compra/canje/sello de todos
-- los tenants. Sus lecturas calientes filtran por (tenant_id, created_at):
--   - get_metricas_resumen: tenant + rango de fechas (dashboard admin, cada carga)
--   - get_miembros_inactivos: tenant + max(created_at) por miembro
--
-- El índice original de 0001 era solo (tenant_id): con historial largo, cada
-- vista del dashboard escanea TODAS las transacciones del tenant para quedarse
-- con 30 días. El compuesto deja ambas consultas en un range scan.
--
-- (tenant_id, miembro_id, created_at) ya existe desde 0032 para las lecturas
-- por miembro; este cubre las de tenant completo.

create index if not exists idx_transacciones_tenant_created
  on transacciones (tenant_id, created_at desc);

-- El viejo (tenant_id) queda redundante: el compuesto sirve como prefijo para
-- cualquier consulta que filtre solo por tenant_id.
drop index if exists idx_transacciones_tenant;
