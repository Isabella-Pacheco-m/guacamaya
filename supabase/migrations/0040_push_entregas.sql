-- 0040_push_entregas.sql — Saber si la notificación LLEGÓ, no solo si se envió.
--
-- El problema que resuelve esta migración: con Web Push, el servidor solo
-- sabe lo que le dice el push service (FCM, Mozilla, Apple). Un 201 significa
-- "acepté el mensaje", NO "el celular lo mostró". Un endpoint atado a una
-- clave VAPID vieja, o una suscripción zombi, se acepta con 201 y se descarta
-- en el dispositivo sin que nadie se entere. Desde el panel eso se ve
-- idéntico a un envío perfecto: "Llegó a 12 dispositivos" y nadie recibió
-- nada.
--
-- La única fuente de verdad es el propio dispositivo: el service worker
-- confirma cada push que recibe (ver public/push-sw.js → /api/push/entregas).
--
--   - `push_suscripciones.clave_vapid`  : con qué clave pública se creó la
--     suscripción. Si no es la actual de la plataforma, ese dispositivo NUNCA
--     recibirá nada hasta volver a suscribirse. Antes era invisible.
--   - `push_suscripciones.ultima_entrega`: último push confirmado por el
--     dispositivo. Distingue "suscrito" de "vivo".
--   - `push_envios.entregados`          : confirmaciones reales de la campaña.
--   - `push_envios.detalle`             : conteo por código HTTP del push
--     service (201, 403, 404, 410…) para ver el motivo de los fallos.
--   - `push_entregas`                   : una fila por dispositivo y campaña;
--     hace el conteo idempotente (el mismo push confirmado dos veces no
--     infla el contador).

alter table push_suscripciones
  add column if not exists clave_vapid    text,
  add column if not exists ultima_entrega timestamptz;

alter table push_envios
  add column if not exists entregados int not null default 0,
  add column if not exists detalle    jsonb;

create table if not exists push_entregas (
  envio_id   uuid not null references push_envios(id) on delete cascade,
  endpoint   text not null,
  created_at timestamptz not null default now(),
  primary key (envio_id, endpoint)
);

alter table push_entregas enable row level security;

-- Registra la confirmación de entrega de un dispositivo.
--
-- Idempotente: el mismo (envío, endpoint) solo cuenta una vez, así que un
-- reintento del service worker no infla el contador. Devuelve true solo la
-- primera vez, para que el contador de la campaña se incremente una sola vez.
create or replace function push_registrar_entrega(
  p_endpoint text,
  p_envio_id uuid default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  nuevas int := 0;
begin
  -- Señal de vida del dispositivo, haya o no campaña asociada (también la
  -- deja la notificación de prueba).
  update push_suscripciones
     set ultima_entrega = now()
   where endpoint = p_endpoint;

  if p_envio_id is null then
    return false;
  end if;

  insert into push_entregas (envio_id, endpoint)
  values (p_envio_id, p_endpoint)
  on conflict do nothing;

  get diagnostics nuevas = row_count;
  if nuevas = 0 then
    return false;
  end if;

  update push_envios
     set entregados = entregados + 1
   where id = p_envio_id;

  return true;
end;
$$;

-- Mismos permisos que el resto de tablas de push (0039): solo service_role.
grant all on table public.push_entregas to service_role;
revoke all on table public.push_entregas from anon, authenticated;

revoke all on function public.push_registrar_entrega(text, uuid) from public, anon, authenticated;
grant execute on function public.push_registrar_entrega(text, uuid) to service_role;
