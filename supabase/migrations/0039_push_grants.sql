-- 0039_push_grants.sql — permisos explícitos de las tablas de push.
--
-- 0020 dejó `alter default privileges ... grant all on tables to service_role`
-- para los objetos futuros, pero esos defaults solo aplican a las tablas que
-- cree el MISMO rol que los definió. Si 0038 se ejecutó desde otra sesión o
-- rol (p. ej. el SQL Editor con un rol distinto), `push_suscripciones` y
-- `push_envios` quedan sin grants y la app falla al insertar con
-- "permission denied for table" (SQLSTATE 42501) — visible como suscripción
-- que "se acepta" en el celular pero nunca aparece en el panel.
--
-- Idempotente: si los grants ya estaban, no cambia nada.

grant all on table public.push_suscripciones to service_role;
grant all on table public.push_envios        to service_role;

revoke all on table public.push_suscripciones from anon, authenticated;
revoke all on table public.push_envios        from anon, authenticated;
