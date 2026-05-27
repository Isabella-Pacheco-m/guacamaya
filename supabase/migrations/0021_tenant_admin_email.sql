-- 0021_tenant_admin_email.sql — admin del negocio por email asignado.
--
-- Reemplaza el flujo de onboarding por URL (admin_invitations + claim que
-- escribía app_metadata.tenantId en Auth0 vía Management API) por un modelo
-- DB-based, igual que los miembros (que ya se vinculan por
-- miembros.auth0_user_id):
--
--   El superadmin asigna un `admin_email` al crear el tenant. El admin entra a
--   {slug}.guacamaya.net e inicia sesión con ESE correo (verificado por el
--   IdP). El match (email del token == tenants.admin_email) + el subdominio
--   es suficiente para darle acceso al panel. Sin token, sin URL de claim,
--   sin dependencia del Auth0 Management API.
--
-- Se guarda en minúsculas. Un email puede ser admin de varios tenants
-- distintos (no hay unique global), pero cada tenant tiene un solo admin_email.

alter table tenants
  add column if not exists admin_email text;

-- Lookup por email (apex → subdominio del admin) en login.
create index if not exists idx_tenants_admin_email
  on tenants (admin_email);
