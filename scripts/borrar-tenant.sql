-- borrar-tenant.sql — BORRA UNA SOLA EMPRESA (tenant) y todo lo suyo.
--
-- ⚠️  IRREVERSIBLE. Elimina el tenant, sus miembros, transacciones,
--     recompensas, tarjeta (premios y canjes), invitaciones y toda la
--     comunidad (feed, notas, galería, sorteos, retos, lanzamientos).
--
-- Los demás tenants NO se tocan.
--
-- Los archivos del bucket van aparte (storage.objects está protegido con un
-- trigger y no acepta deletes por SQL). Dos caminos, cualquiera de los dos:
--   a) Dashboard → Storage → business_media → carpeta tenants/<id> → Delete
--   b) node scripts/borrar-tenant-storage.mjs burger-house --confirm
-- Si vas por (b), córrelo ANTES de este SQL: el script resuelve el id desde
-- el slug y necesita que el tenant siga en la DB.
--
-- Lo que NO borra:
--   - Auth0: las cuentas de login siguen existiendo. El bloque PREFLIGHT
--     lista los `auth0_user_id` por si quieres eliminarlas en el dashboard
--     de Auth0 (User Management → Users).
--   - Wompi: si el negocio tenía suscripción activa, cancélala también allá.
--
-- Uso: Supabase Dashboard → SQL Editor. Correr PREFLIGHT, revisar, y luego
-- el bloque de BORRADO (cambiando el slug si es otro negocio).

-- ════════════════ PREFLIGHT (solo lectura — correr primero) ════════════════
-- select t.id, t.nombre, t.slug, t.admin_email,
--        (select count(*) from miembros      m where m.tenant_id = t.id) as miembros,
--        (select count(*) from transacciones x where x.tenant_id = t.id) as transacciones,
--        (select count(*) from feed_posts    f where f.tenant_id = t.id) as posts,
--        (select count(*) from galeria_posts g where g.tenant_id = t.id) as fotos
--   from tenants t
--  where t.slug = 'burger-house';
--
-- -- Cuentas de Auth0 a limpiar a mano (si quieres):
-- select m.nombre, m.email, m.auth0_user_id
--   from miembros m join tenants t on t.id = m.tenant_id
--  where t.slug = 'burger-house';

-- ═══════════════════════════ BORRADO ═══════════════════════════
do $$
declare
  v_slug  text := 'burger-house';   -- ← el único valor a cambiar
  v_id    uuid;
  v_email text;
begin
  select id, admin_email into v_id, v_email from tenants where slug = v_slug;
  if v_id is null then
    raise exception 'No existe un tenant con slug %', v_slug;
  end if;

  -- Las tablas de contenido tienen RLS por app.tenant_id; el owner la
  -- bypassa, pero fijarla evita sorpresas si esto corre con otro rol.
  perform set_config('app.tenant_id', v_id::text, true);

  -- Hijos primero: tarjeta_canjes y sorteos.ganador_miembro_id apuntan a
  -- miembros SIN on delete cascade, así que el orden importa.
  delete from tarjeta_canjes        where tenant_id = v_id;
  delete from tarjeta_premios       where tenant_id = v_id;
  delete from transacciones         where tenant_id = v_id;
  delete from reto_participaciones  where tenant_id = v_id;
  delete from retos                 where tenant_id = v_id;
  delete from sorteo_participaciones where tenant_id = v_id;
  delete from sorteos               where tenant_id = v_id;
  delete from galeria_posts         where tenant_id = v_id;
  delete from feed_posts            where tenant_id = v_id;
  delete from notas                 where tenant_id = v_id;
  delete from lanzamientos          where tenant_id = v_id;
  delete from invitaciones          where tenant_id = v_id;
  delete from admin_invitations     where tenant_id = v_id;
  delete from recompensas           where tenant_id = v_id;
  delete from tenant_features       where tenant_id = v_id;
  delete from miembros              where tenant_id = v_id;

  -- OJO: los archivos del bucket NO se borran acá. Supabase protege
  -- storage.objects con un trigger (storage.protect_delete) y un delete
  -- directo falla; además borrar la fila dejaría el archivo huérfano en el
  -- object store. Van por la Storage API — ver el NOTICE del final.

  -- Suscripción a la plataforma: se vincula por email, no por FK.
  if v_email is not null then
    delete from suscripciones where lower(email) = lower(v_email);
  end if;

  delete from tenants where id = v_id;

  raise notice 'Tenant % (%) eliminado.', v_slug, v_id;
  raise notice 'Falta el storage: Dashboard → Storage → business_media → carpeta tenants/% → Delete', v_id;
end $$;

-- ═══════════════════ VERIFICACIÓN (después) ═══════════════════
-- Debe devolver 0 filas:
-- select * from tenants where slug = 'burger-house';
-- Y no deben quedar huérfanos (0 en todas):
-- select count(*) from miembros      where tenant_id not in (select id from tenants);
-- select count(*) from transacciones where tenant_id not in (select id from tenants);
