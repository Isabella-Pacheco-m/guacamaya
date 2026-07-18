-- 0025_tenant_banner.sql — banner de portada de la comunidad.
--
-- Además del logo (cuadrado, marca), la marca puede subir un banner horizontal
-- que se muestra como portada arriba de la home de la comunidad (PWA) y en la
-- landing del tenant. Se guarda en Storage (prefijo tenants/<id>/banner/) y la
-- URL pública queda aquí.

alter table tenants
  add column if not exists banner_url text;
