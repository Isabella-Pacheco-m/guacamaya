-- 0006_list_transacciones.sql — Historial de movimientos del miembro.
--
-- Lo consume la PWA cliente (/puntos) y el detalle del miembro en admin.
-- security invoker + set_config(app.tenant_id) — patrón estándar.

create or replace function public.list_transacciones_for_miembro(
  p_tenant_id  uuid,
  p_miembro_id uuid,
  p_limit      int default 50
) returns setof transacciones
language plpgsql
security invoker
as $$
begin
  perform pg_catalog.set_config('app.tenant_id', p_tenant_id::text, true);
  return query
    select *
    from transacciones
    where tenant_id = p_tenant_id and miembro_id = p_miembro_id
    order by created_at desc
    limit greatest(1, least(p_limit, 200));
end;
$$;
