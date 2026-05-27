-- 0022_join_community.sql — auto-registro de miembros + enlace de invitación
-- a la comunidad.
--
-- Antes: el admin creaba el miembro y le mandaba un enlace por-miembro; el
-- cliente no podía unirse solo. Ahora hay dos caminos nuevos (el flujo viejo
-- por-miembro sigue intacto):
--
--   1) Registro abierto: si `registro_abierto` está ON (default), cualquier
--      usuario logueado en {slug}.guacamaya.net puede unirse a la comunidad
--      sin enlace — se crea su fila en `miembros` vinculada a su auth0_user_id.
--
--   2) Enlace de invitación a la comunidad: el negocio genera un `join_code`
--      reusable; quien abra {AUTH_BASE}/unirse/{code} e inicie sesión queda
--      asignado como miembro, incluso con registro_abierto OFF.

-- Flag de registro abierto (default true: "ya creado el negocio → pueden unirse").
alter table tenant_features
  add column if not exists registro_abierto boolean not null default true;

-- Código de invitación a la comunidad (reusable, rotable). Único global para
-- poder resolver el tenant desde el código en /unirse/{code}.
alter table tenants
  add column if not exists join_code text;

create unique index if not exists idx_tenants_join_code on tenants (join_code);
