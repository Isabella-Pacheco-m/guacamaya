-- 0024_tarjeta_personalizacion.sql — más control visual de la tarjeta.
--
-- Añade a tenant_features:
--   - tarjeta_fondo_tipo   — 'solid' (default, un color) o 'gradient' (degradado
--                            entre tarjeta_color_fondo y tarjeta_color_fondo2).
--   - tarjeta_color_fondo2 — segundo stop del degradado (hex, opcional).
--   - tarjeta_sello_url    — PNG subido por la marca para usar como estampilla.
--                            En la tarjeta se pinta como silueta oscura cuando
--                            el sello NO está marcado y a color cuando SÍ.
--
-- Todos con default seguro: los tenants existentes conservan su tarjeta actual
-- (fondo sólido, sin estampilla PNG → se usa el emblema SVG de siempre).

alter table tenant_features
  add column if not exists tarjeta_fondo_tipo text not null default 'solid';

alter table tenant_features
  add column if not exists tarjeta_color_fondo2 text;

alter table tenant_features
  add column if not exists tarjeta_sello_url text;

alter table tenant_features
  drop constraint if exists tarjeta_fondo_tipo_valido;
alter table tenant_features
  add constraint tarjeta_fondo_tipo_valido
  check (tarjeta_fondo_tipo in ('solid', 'gradient')) not valid;
alter table tenant_features validate constraint tarjeta_fondo_tipo_valido;

alter table tenant_features
  drop constraint if exists tarjeta_color_fondo2_hex;
alter table tenant_features
  add constraint tarjeta_color_fondo2_hex
  check (tarjeta_color_fondo2 is null or tarjeta_color_fondo2 ~ '^#[0-9A-Fa-f]{6}$') not valid;
alter table tenant_features validate constraint tarjeta_color_fondo2_hex;
