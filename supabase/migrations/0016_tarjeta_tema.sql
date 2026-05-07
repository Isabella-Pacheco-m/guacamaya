-- 0016_tarjeta_tema.sql — personalización visual de la tarjeta de fidelización.
--
-- El admin de cada tenant puede ajustar cómo se ve su tarjeta digital en la
-- PWA del cliente: color de fondo, color del sello y un "estilo" (forma del
-- sello). El color global del tenant (color_primario) sigue siendo el acento
-- de links / progreso; estos campos son específicos de la tarjeta.

alter table tenant_features
  add column if not exists tarjeta_color_fondo text not null default '#1A1A1E';

alter table tenant_features
  add column if not exists tarjeta_color_sello text not null default '#B8FA4E';

-- Estilos soportados por el componente TarjetaCliente (PWA):
--   'circulo'   — sello redondo con icono ✓
--   'estrella'  — sello redondo con icono ★
--   'corazon'   — sello redondo con icono ♥
--   'cuadrado'  — sello cuadrado con icono ✓
alter table tenant_features
  add column if not exists tarjeta_estilo_sello text not null default 'circulo';

alter table tenant_features
  drop constraint if exists tarjeta_estilo_sello_valido;
alter table tenant_features
  add constraint tarjeta_estilo_sello_valido
  check (tarjeta_estilo_sello in ('circulo', 'estrella', 'corazon', 'cuadrado')) not valid;
alter table tenant_features validate constraint tarjeta_estilo_sello_valido;

alter table tenant_features
  drop constraint if exists tarjeta_color_fondo_hex;
alter table tenant_features
  add constraint tarjeta_color_fondo_hex
  check (tarjeta_color_fondo ~ '^#[0-9A-Fa-f]{6}$') not valid;
alter table tenant_features validate constraint tarjeta_color_fondo_hex;

alter table tenant_features
  drop constraint if exists tarjeta_color_sello_hex;
alter table tenant_features
  add constraint tarjeta_color_sello_hex
  check (tarjeta_color_sello ~ '^#[0-9A-Fa-f]{6}$') not valid;
alter table tenant_features validate constraint tarjeta_color_sello_hex;
