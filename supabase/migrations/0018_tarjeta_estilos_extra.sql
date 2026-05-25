-- 0018_tarjeta_estilos_extra.sql — nuevas formas de sello para la tarjeta.
--
-- Amplía el constraint de tarjeta_estilo_sello para aceptar 'diamante' y
-- 'hexagono', además de las cuatro formas originales. Debe ir alineado con
-- TARJETA_ESTILOS en lib/tarjeta.ts.

alter table tenant_features
  drop constraint if exists tarjeta_estilo_sello_valido;

alter table tenant_features
  add constraint tarjeta_estilo_sello_valido
  check (
    tarjeta_estilo_sello in (
      'circulo', 'estrella', 'corazon', 'cuadrado', 'diamante', 'hexagono'
    )
  ) not valid;

alter table tenant_features validate constraint tarjeta_estilo_sello_valido;
