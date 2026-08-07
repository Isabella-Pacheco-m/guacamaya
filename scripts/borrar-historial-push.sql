-- borrar-historial-push.sql — BORRA EL HISTORIAL DE NOTIFICACIONES ENVIADAS.
--
-- ⚠️  IRREVERSIBLE. Vacía `push_envios` (lo que el panel muestra en "Envíos
--     recientes") y, en cascada, sus confirmaciones de entrega en
--     `push_entregas`.
--
-- Pensado para limpiar las pruebas fallidas de cuando el push no funcionaba.
--
-- Lo que NO toca — importante:
--   - `push_suscripciones`: los dispositivos suscritos NO se dan de baja.
--     Borrar esa tabla obligaría a cada miembro a volver a activar las
--     notificaciones a mano, y no hace ninguna falta para limpiar el
--     historial.
--   - `push_suscripciones.ultima_entrega`: la señal de vida de cada
--     dispositivo se conserva, así que el panel sigue sabiendo cuántos
--     reciben notificaciones de verdad.
--   - El esquema y los permisos.
--
-- Uso: Supabase Dashboard → SQL Editor → pegar y ejecutar.
-- Correr primero el PREFLIGHT para ver qué se va a borrar.

-- ════════════════ PREFLIGHT (solo lectura — correr primero) ════════════════
-- select t.slug,
--        count(*)                       as envios,
--        min(e.created_at)::date        as desde,
--        max(e.created_at)::date        as hasta,
--        sum(e.enviados)                as aceptadas,
--        sum(e.entregados)              as confirmadas
--   from push_envios e
--   join tenants t on t.id = e.tenant_id
--  group by t.slug
--  order by t.slug;

-- ════════════════ OPCIÓN A — un solo club (recomendada) ════════════════
-- Cambiar el slug por el del club. push_entregas se va en cascada.

delete from push_envios
 where tenant_id = (select id from tenants where slug = 'coffeehaus');

-- ════════════════ OPCIÓN B — todos los clubes ════════════════
-- Descomentar SOLO si de verdad quieres vaciar el historial de todos.
-- No uses `truncate`: se saltaría la cascada declarada hacia push_entregas.
--
-- delete from push_envios;

-- ════════════════ COMPROBACIÓN (después) ════════════════
-- select (select count(*) from push_envios)         as envios_restantes,
--        (select count(*) from push_entregas)       as entregas_restantes,
--        (select count(*) from push_suscripciones)  as dispositivos_intactos;
