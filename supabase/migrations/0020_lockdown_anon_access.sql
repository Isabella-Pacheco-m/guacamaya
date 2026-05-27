-- 0020_lockdown_anon_access.sql — Cierra el acceso de anon/authenticated.
--
-- La app accede a Postgres solo por el service role; anon/authenticated nunca
-- se usan. Por defecto PostgREST exponía las RPC y las tablas sin RLS a anon
-- (cuya key es pública), permitiendo saltarse Auth0 y el aislamiento por tenant.
-- Revocar todo a esos roles no rompe nada y cierra el bypass. Idempotente.

-- Funciones: solo service role (re-grant explícito tras revocar de PUBLIC).
revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon, authenticated;
grant  execute on all functions in schema public to service_role, postgres;

-- Tablas y secuencias: anon/authenticated sin acceso directo.
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
grant  all on all tables    in schema public to service_role;
grant  all on all sequences in schema public to service_role;

-- RLS en las tablas que faltaban (service_role la bypassa).
alter table tenants            enable row level security;
alter table admin_invitations  enable row level security;
alter table tarjeta_premios    enable row level security;
alter table tenant_features    enable row level security;

-- Objetos futuros: que no vuelvan a quedar abiertos por defecto.
alter default privileges in schema public
  revoke execute on functions from public, anon, authenticated;
alter default privileges in schema public
  grant execute on functions to service_role;
alter default privileges in schema public
  revoke all on tables from anon, authenticated;
alter default privileges in schema public
  grant all on tables to service_role;
