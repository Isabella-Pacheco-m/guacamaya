-- limpiar-datos.sql — BORRA TODO EL CONTENIDO de la plataforma.
--
-- ⚠️  IRREVERSIBLE. Elimina todas las empresas (tenants), sus miembros,
--     transacciones, recompensas, comunidad (feed/notas/galería/sorteos/
--     retos/lanzamientos), tarjetas e invitaciones — de TODOS los tenants.
--
-- Lo que NO toca:
--   - El superadmin: no vive en la DB (allow-list SUPERADMIN_EMAILS + Auth0).
--   - `_migrations`: el registro de migraciones aplicadas queda intacto.
--   - El esquema: tablas, funciones, índices y RLS quedan como están.
--   - Storage: los archivos del bucket `business_media` se vacían aparte
--     (Dashboard → Storage → business_media → seleccionar todo → Delete).
--   - Auth0: las cuentas de login siguen existiendo; al quedar desvinculadas
--     (miembros borrados), quien entre de nuevo pasará por el flujo de
--     registro del tenant que exista en ese momento.
--
-- Uso: Supabase Dashboard → SQL Editor → pegar y ejecutar.
-- Recomendado: correr primero el bloque PREFLIGHT para ver qué se va a borrar.

-- ════════════════ PREFLIGHT (solo lectura — correr primero) ════════════════
-- select 'tenants' t, count(*) from tenants
-- union all select 'miembros', count(*) from miembros
-- union all select 'transacciones', count(*) from transacciones
-- union all select 'recompensas', count(*) from recompensas
-- union all select 'feed_posts', count(*) from feed_posts
-- union all select 'galeria_posts', count(*) from galeria_posts
-- union all select 'sorteos', count(*) from sorteos
-- union all select 'retos', count(*) from retos
-- order by 1;

-- ═══════════════════════════ BORRADO ═══════════════════════════
-- Un solo TRUNCATE con la lista explícita de las 17 tablas de contenido:
-- al ir todas en la misma sentencia no importa el orden de FKs, y CASCADE
-- cubre cualquier referencia que se agregue en el futuro.
truncate table
  transacciones,
  tarjeta_canjes,
  tarjeta_premios,
  reto_participaciones,
  retos,
  sorteo_participaciones,
  sorteos,
  galeria_posts,
  lanzamientos,
  feed_posts,
  notas,
  recompensas,
  invitaciones,
  admin_invitations,
  tenant_features,
  miembros,
  tenants
cascade;

-- ═══════════════════ VERIFICACIÓN (después) ═══════════════════
-- Debe devolver 0 en todas:
-- select count(*) from tenants;
-- select count(*) from miembros;
-- select count(*) from transacciones;
-- Y las migraciones deben seguir (35 filas):
-- select count(*) from _migrations;
